import postgres from "postgres";
import { createCheckoutHandler, createPostgresCheckoutStore } from "./profi-checkout.server";
import { createSessionVerifier } from "./profi-session.server";

let handler: ReturnType<typeof createCheckoutHandler> | undefined;

export async function handleProfiCheckout(request: Request) {
  if (process.env.PROFI_CHECKOUT_ENABLED !== "1") {
    return new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });
  }

  try {
    if (!handler) {
      const databaseUrl = process.env.PROFI_DATABASE_URL;
      const configuredOrigin = process.env.PROFI_CHECKOUT_ORIGIN;
      if (!databaseUrl || !configuredOrigin) throw new Error("Оформление заказа не настроено");
      const origin = new URL(configuredOrigin);
      if (origin.protocol !== "https:" && !(origin.protocol === "http:" && origin.hostname === "127.0.0.1")) {
        throw new Error("Для оформления заказа нужен HTTPS");
      }
      const sql = postgres(databaseUrl, {
        max: 5,
        idle_timeout: 30,
        connect_timeout: 5,
        prepare: false,
      });
      handler = createCheckoutHandler({
        origin: origin.origin,
        verifySession: createSessionVerifier(async (statement, [hash]) => ({
          rows: await sql.unsafe<{ auth_subject: string }[]>(statement, [hash]),
        })),
        createOrder: createPostgresCheckoutStore(async (statement, [subject, key, skus]) => ({
          rows: await sql.unsafe<{ order_id: string }[]>(statement, [subject, key, sql.array(skus, 25)]),
        })),
      });
    }
    return await handler(request);
  } catch {
    return Response.json({ error: "checkout_unavailable" }, {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
