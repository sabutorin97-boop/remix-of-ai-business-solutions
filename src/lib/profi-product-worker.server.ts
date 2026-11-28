import type { Sql } from "postgres";
import { z } from "zod";
import { buildRadarReport } from "./profi-radar-report";
import { buildReactiveDemo, reactiveKitText } from "./reactive-kit";

type Job = { order_id: string; lease_token: string };
type ProductResult = { sku: string; payload: object };
type WorkerStore = {
  claim(): Promise<Job | undefined>;
  items(orderId: string): Promise<string[]>;
  input(orderId: string, sku: string): Promise<unknown>;
  save(job: Job, results: ProductResult[]): Promise<boolean>;
  retry(job: Job): Promise<boolean>;
};

const productInput = z.object({
  brief: z.unknown(),
  observations: z.unknown().optional(),
  competitors: z.unknown().optional(),
});

function buildProductResult(sku: string, raw: unknown): ProductResult {
  const input = productInput.parse(raw);
  switch (sku) {
    case "reactive-ai": {
      const report = buildReactiveDemo(input.brief);
      return { sku, payload: { type: "demo", report, text: reactiveKitText(report) } };
    }
    case "ai-radar":
      return { sku, payload: { type: "observations", report: buildRadarReport(
        input.brief, input.observations, input.competitors ?? [],
      ) } };
    default:
      throw new Error("Для товара не настроена автоматическая выдача");
  }
}

export async function fulfillNextProductOrder(store: WorkerStore) {
  const job = await store.claim();
  if (!job) return "idle";

  try {
    const skus = await store.items(job.order_id);
    if (!skus.length) throw new Error("В заказе нет товаров");
    const results: ProductResult[] = [];
    for (const sku of skus) {
      results.push(buildProductResult(sku, await store.input(job.order_id, sku)));
    }
    return await store.save(job, results) ? "completed" : "lease_lost";
  } catch {
    return await store.retry(job) ? "retry_recorded" : "lease_lost";
  }
}

export function createPostgresProductWorkerStore(sql: Sql): WorkerStore {
  return {
    async input(orderId, sku) {
      const [row] = await sql<{ payload: unknown }[]> `
        SELECT payload FROM profi_market.product_inputs WHERE order_id = ${orderId}::uuid AND sku = ${sku}
      `;
      return row?.payload;
    },
    async claim() {
      const [job] = await sql<Job[]> `SELECT order_id, lease_token FROM profi_market.claim_prepared_fulfillment_job()`;
      return job;
    },
    async items(orderId) {
      const rows = await sql<{ sku: string }[]> `
        SELECT sku FROM profi_market.order_items WHERE order_id = ${orderId}::uuid ORDER BY sku
      `;
      return rows.map(({ sku }) => sku);
    },
    async save(job, results) {
      const [row] = await sql<{ saved: boolean }[]> `
        SELECT profi_market.store_fulfillment_results(
          ${job.order_id}::uuid, ${job.lease_token}::uuid, ${JSON.stringify(results)}::text::jsonb
        ) AS saved
      `;
      return row.saved;
    },
    async retry(job) {
      const [row] = await sql<{ requeued: boolean }[]> `
        SELECT profi_market.finish_fulfillment_job(${job.order_id}::uuid, ${job.lease_token}::uuid, false) AS requeued
      `;
      return row.requeued;
    },
  };
}
