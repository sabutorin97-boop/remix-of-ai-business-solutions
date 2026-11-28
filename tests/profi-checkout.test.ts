import assert from "node:assert/strict";
import { it } from "node:test";
import { createCheckoutHandler, createPostgresCheckoutStore } from "../src/lib/profi-checkout.server";

const origin = "https://shop.example.test";
const orderId = "19513912-5c20-4bb5-8f42-e82b58664780";
const order = { requestKey: "request-123", skus: ["reactive-ai"] };

function request(body: unknown = order, from = origin) {
  return new Request(origin + "/api/checkout", {
    method: "POST",
    headers: { origin: from, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

it("создаёт заказ от имени покупателя из проверенной сессии", async () => {
  const handle = createCheckoutHandler({
    origin,
    verifySession: async () => ({ subject: "buyer-from-session" }),
    createOrder: async (input) => {
      assert.deepEqual(input, { ...order, subject: "buyer-from-session" });
      return orderId;
    },
  });
  const response = await handle(request());
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(await response.json(), { orderId });
});

it("передаёт данные отдельными параметрами и различает отказ БД и сбой", async () => {
  const input = { ...order, subject: "buyer-from-session" };
  const createOrder = createPostgresCheckoutStore(async (sql, parameters) => {
    assert.match(sql, /profi_market\.create_verified_checkout\(\$1, \$2, \$3\)/);
    assert.deepEqual(parameters, [input.subject, input.requestKey, input.skus]);
    return { rows: [{ order_id: orderId }] };
  });
  assert.equal(await createOrder(input), orderId);
  const rejected = createPostgresCheckoutStore(async () => { throw { code: "22023" }; });
  assert.equal(await rejected(input), null);
  const unavailable = createPostgresCheckoutStore(async () => { throw new Error("Недоступно"); });
  await assert.rejects(unavailable(input));
});

it("отклоняет запросы без сессии, с чужого сайта и с подменой покупателя или цены", async () => {
  let subject: string | undefined;
  const handle = createCheckoutHandler({
    origin,
    verifySession: async () => subject ? { subject } : null,
    createOrder: async () => assert.fail("Запись заказа не должна вызываться"),
  });
  assert.equal((await handle(request())).status, 401);
  subject = "buyer-from-session";
  assert.equal((await handle(request(order, "https://other.example.test"))).status, 403);
  assert.equal((await handle(request({ ...order, subject: "other-buyer" }))).status, 400);
  assert.equal((await handle(request({ ...order, price: 1 }))).status, 400);
  assert.equal((await handle(request({ ...order, skus: ["a".repeat(5000)] }))).status, 413);
});

it("привязывает анкету к заказу проверенного покупателя и отклоняет чужой SKU", async () => {
  const inputs = { "reactive-ai": { brief: {
    business: "Мастерская", offer: "Ремонт мебели", averageCheck: 2500, objections: "",
    lastContact: "month", permittedOffer: "", tone: "friendly",
  } } };
  const handle = createCheckoutHandler({
    origin, verifySession: async () => ({ subject: "buyer-from-session" }),
    createOrder: async (input) => {
      assert.deepEqual(input, { ...order, subject: "buyer-from-session", inputs });
      return orderId;
    },
  });
  assert.equal((await handle(request({ ...order, inputs }))).status, 200);
  assert.equal((await handle(request({ ...order, inputs: { "ai-radar": inputs["reactive-ai"] } }))).status, 400);
  assert.equal((await handle(request({ ...order, inputs: { "reactive-ai": { brief: {} } } }))).status, 400);
});
