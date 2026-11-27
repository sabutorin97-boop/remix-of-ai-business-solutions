import assert from "node:assert/strict";
import { it } from "node:test";
import { fulfillNextProductOrder } from "../src/lib/profi-product-worker.server";

const job = { order_id: "order", lease_token: "lease" };
const brief = {
  business: "Мастерская", offer: "Ремонт мебели", averageCheck: 2500, objections: "",
  lastContact: "month", permittedOffer: "", tone: "friendly",
};

it("собирает комплект из анкеты и сохраняет результат по аренде задания", async () => {
  const outcome = await fulfillNextProductOrder({
    claim: async () => job,
    items: async (id) => { assert.equal(id, job.order_id); return ["reactive-ai"]; },
    input: async (id, sku) => {
      assert.deepEqual([id, sku], [job.order_id, "reactive-ai"]);
      return { brief };
    },
    save: async (current, results) => {
      assert.deepEqual(current, job);
      assert.equal(results.length, 1);
      assert.equal(results[0].sku, "reactive-ai");
      assert.match(JSON.stringify(results[0].payload), /Ремонт мебели/);
      return true;
    },
    retry: async () => assert.fail(),
  });
  assert.equal(outcome, "completed");
});

it("не сохраняет неполный комплект и отдаёт ошибку на повтор очереди", async () => {
  const outcome = await fulfillNextProductOrder({
    claim: async () => job,
    items: async () => ["reactive-ai", "ai-radar"],
    input: async (_, sku) => sku === "reactive-ai" ? { brief } : undefined,
    save: async () => assert.fail(),
    retry: async (current) => { assert.deepEqual(current, job); return true; },
  });
  assert.equal(outcome, "retry_recorded");
});
