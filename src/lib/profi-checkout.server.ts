import { z } from "zod";

const maxBodyBytes = 4096;
const checkoutInput = z.object({
  requestKey: z.string().regex(/^[A-Za-z0-9_-]{8,128}$/),
  skus: z.array(z.string().regex(/^[a-z0-9-]{1,64}$/)).min(1).max(5)
    .refine((skus) => new Set(skus).size === skus.length),
}).strict();

type CheckoutOrder = z.infer<typeof checkoutInput> & { subject: string };
type CheckoutDependencies = {
  origin: string;
  verifySession(request: Request): Promise<{ subject: string } | null>;
  createOrder(input: CheckoutOrder): Promise<string | null>;
};

type CheckoutQuery = (
  sql: string,
  parameters: [string, string, string[]],
) => Promise<{ rows: { order_id: string }[] }>;

export function createPostgresCheckoutStore(query: CheckoutQuery): CheckoutDependencies["createOrder"] {
  return async ({ subject, requestKey, skus }) => {
    try {
      const { rows } = await query(
        "SELECT profi_market.create_verified_checkout($1, $2, $3) AS order_id",
        [subject, requestKey, skus],
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
    if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
      return reply(415, { error: "unsupported_media_type" });
    }

    try {
      const session = await dependencies.verifySession(request);
      if (!session?.subject.trim()) return reply(401, { error: "sign_in_required" });

      const reader = request.body?.getReader();
      if (!reader) return reply(400, { error: "invalid_order" });
      const buffer = new Uint8Array(maxBodyBytes);
      let length = 0;
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (length + value.length > maxBodyBytes) {
            void reader.cancel().catch(() => {});
            return reply(413, { error: "body_too_large" });
          }
          buffer.set(value, length);
          length += value.length;
        }
      } finally {
        reader.releaseLock();
      }

      let body: unknown;
      try {
        body = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(buffer.subarray(0, length)));
      } catch {
        return reply(400, { error: "invalid_order" });
      }
      const input = checkoutInput.safeParse(body);
      if (!input.success) return reply(400, { error: "invalid_order" });
      const orderId = await dependencies.createOrder({ ...input.data, subject: session.subject });
      return orderId ? reply(200, { orderId }) : reply(422, { error: "order_rejected" });
    } catch {
      return reply(503, { error: "checkout_unavailable" });
    }
  };
}
