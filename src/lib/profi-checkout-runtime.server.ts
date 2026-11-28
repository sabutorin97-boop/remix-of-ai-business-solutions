import postgres from "postgres";
import { createCheckoutHandler, createPostgresCheckoutStore } from "./profi-checkout.server";
import { createSessionVerifier } from "./profi-session.server";

let handler: ReturnType<typeof createCheckoutHandler> | undefined;
let database: ReturnType<typeof postgres> | undefined;

export function getProfiDatabase() {
  const url = process.env.PROFI_DATABASE_URL;
  if (!url) throw new Error("База Profi Market не настроена");
  return database ??= postgres(url, {
    max: 5, idle_timeout: 30, connect_timeout: 5, prepare: false,
  });
}

export async function handleProfiCheckout(request: Request) {
  if (process.env.PROFI_CHECKOUT_ENABLED !== "1") {
    return new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });
  }

  try {
    if (!handler) {
      const configuredOrigin = process.env.PROFI_CHECKOUT_ORIGIN;
      if (!configuredOrigin) throw new Error("Оформление заказа не настроено");
      const origin = new URL(configuredOrigin);
      if (origin.protocol !== "https:" && !(origin.protocol === "http:" && origin.hostname === "127.0.0.1")) {
        throw new Error("Для оформления заказа нужен HTTPS");
      }
      const sql = getProfiDatabase();
      handler = createCheckoutHandler({
        origin: origin.origin,
        verifySession: createSessionVerifier(async (statement, [hash]) => ({
          rows: await sql.unsafe<{ auth_subject: string }[]>(statement, [hash]),
        })),
        createOrder: createPostgresCheckoutStore(async (statement, [subject, key, skus, inputs]) => ({
          rows: await sql.unsafe<{ order_id: string }[]>(statement, inputs === undefined
          ? [subject, key, sql.array(skus, 25)]
          : [subject, key, sql.array(skus, 25), inputs]),
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
