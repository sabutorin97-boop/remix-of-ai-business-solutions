import { z } from "zod";
import { reactiveBrief } from "./reactive-ai";
import { radarBrief, observation } from "./ai-radar";
import { buildRadarReport } from "./profi-radar-report";
import { isProfiJson, readProfiJson } from "./profi-json.server";

const checkoutInput = z.object({
  requestKey: z.string().regex(/^[A-Za-z0-9_-]{8,128}$/),
  skus: z.array(z.string().regex(/^[a-z0-9-]{1,64}$/)).min(1).max(5)
    .refine((skus) => new Set(skus).size === skus.length),
  inputs: z.object({
    "reactive-ai": z.object({ brief: reactiveBrief }).strict().optional(),
    "ai-radar": z.object({
      brief: radarBrief,
      observations: z.array(observation).min(1).max(60),
      competitors: z.array(z.string().trim().min(2).max(160)).max(3).optional(),
    }).strict().optional(),
  }).strict().optional(),
}).strict().superRefine(({ skus, inputs }, ctx) => {
  if (!inputs) return;
  const keys = Object.keys(inputs);
  if (keys.length !== skus.length || skus.some((sku) => !keys.includes(sku))) {
    ctx.addIssue({ code: "custom", path: ["inputs"], message: "Анкеты должны совпадать с товарами заказа" });
    return;
  }
  const radar = inputs["ai-radar"];
  if (radar) {
    try {
      buildRadarReport(radar.brief, radar.observations, radar.competitors ?? []);
    } catch {
      ctx.addIssue({ code: "custom", path: ["inputs", "ai-radar"], message: "Проверьте наблюдения AI-Радара" });
    }
  }
});

type CheckoutOrder = z.infer<typeof checkoutInput> & { subject: string };
type CheckoutDependencies = {
  origin: string;
  verifySession(request: Request): Promise<{ subject: string } | null>;
  createOrder(input: CheckoutOrder): Promise<string | null>;
};

type CheckoutQuery = (
  sql: string,
  parameters: [string, string, string[], string?],
) => Promise<{ rows: { order_id: string }[] }>;

export function createPostgresCheckoutStore(query: CheckoutQuery): CheckoutDependencies["createOrder"] {
  return async ({ subject, requestKey, skus, inputs }) => {
    try {
      const { rows } = await query(
        inputs
          ? "SELECT profi_market.create_checkout_with_inputs($1, $2, $3, $4::text::jsonb) AS order_id"
          : "SELECT profi_market.create_verified_checkout($1, $2, $3) AS order_id",
        inputs ? [subject, requestKey, skus, JSON.stringify(inputs)] : [subject, requestKey, skus],
      );
      if (!rows[0]?.order_id) throw new Error("База не вернула идентификатор заказа");
      return rows[0].order_id;
    } catch (error) {
      if (typeof error === "object" && error !== null && "code" in error && error.code === "22023") {
        return null;
      }
      throw error;
    }
  };
}

function reply(status: number, body: Record<string, string>) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export function createCheckoutHandler(dependencies: CheckoutDependencies) {
  const origin = new URL(dependencies.origin).origin;
  if (origin === "null") throw new Error("Требуется адрес сайта");

  return async (request: Request): Promise<Response> => {
    if (request.method !== "POST") return reply(405, { error: "method_not_allowed" });
    if (request.headers.get("origin") !== origin) return reply(403, { error: "invalid_origin" });
    if (!isProfiJson(request)) {
      return reply(415, { error: "unsupported_media_type" });
    }

    try {
      const session = await dependencies.verifySession(request);
      if (!session?.subject.trim()) return reply(401, { error: "sign_in_required" });

      const body = await readProfiJson(request, 131072);
      if ("error" in body) return reply(body.error, {
        error: body.error === 413 ? "body_too_large" : "invalid_order",
      });
      if (body.bytes > 4096 && (
        !body.value || typeof body.value !== "object" || !("inputs" in body.value)
      )) return reply(413, { error: "body_too_large" });
      const input = checkoutInput.safeParse(body.value);
      if (!input.success) return reply(400, { error: "invalid_order" });
      const orderId = await dependencies.createOrder({ ...input.data, subject: session.subject });
      return orderId ? reply(200, { orderId }) : reply(422, { error: "order_rejected" });
    } catch {
      return reply(503, { error: "checkout_unavailable" });
    }
  };
}
