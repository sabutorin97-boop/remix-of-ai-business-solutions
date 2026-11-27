import assert from "node:assert/strict";
import { it } from "node:test";
import { createAccountHandler, createPostgresAccountStore } from "../src/lib/profi-account.server";

const origin = "https://shop.example.test";
const accountUrl = origin + "/api/profi-account";

it("читает заказы только для идентификатора из проверенной сессии", async () => {
  const load = createPostgresAccountStore(async (sql, parameters) => {
    if (parameters.length) {
      assert.match(sql, /customers\.auth_subject = \$1/);
      assert.deepEqual(parameters, ["alice"]);
      return [{ id: "alice-order" }];
    }
    return [];
  });
  const handle = createAccountHandler({
    origin, verifySession: async () => ({ subject: "alice" }), load,
    revoke: async () => assert.fail(),
  });
  const reply = await handle(new Request(accountUrl));
  assert.equal(reply.status, 200);
  assert.equal(reply.headers.get("cache-control"), "no-store");
  assert.deepEqual(await reply.json(), { orders: [{ id: "alice-order" }], products: [] });
  assert.equal((await handle(new Request(accountUrl + "?subject=bob"))).status, 400);
});

it("закрывает историю без сессии, а выход принимает только с адреса самого сайта", async () => {
  const handle = createAccountHandler({
    origin, verifySession: async () => null, load: async () => assert.fail(),
    revoke: async () => "__Host-profi_session=; Max-Age=0",
  });
  assert.equal((await handle(new Request(accountUrl))).status, 401);
  assert.equal((await handle(new Request(accountUrl, { method: "POST" }))).status, 403);
  const logout = await handle(new Request(accountUrl, { method: "POST", headers: { origin } }));
  assert.equal(logout.status, 204);
  assert.match(logout.headers.get("set-cookie")!, /Max-Age=0/);
});
