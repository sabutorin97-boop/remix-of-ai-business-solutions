import { createAccountHandler, createPostgresAccountStore } from "./profi-account.server";
import { getProfiDatabase } from "./profi-checkout-runtime.server";
import { createSessionRevoker, createSessionVerifier } from "./profi-session.server";

export function isProfiAccountEnabled() {
  return process.env.PROFI_ACCOUNT_TEST_ENABLED === "1";
}

export async function handleProfiAccount(request: Request) {
  const headers = { "Cache-Control": "no-store" };
  if (!isProfiAccountEnabled()) return new Response(null, { status: 404, headers });
  try {
    const configuredOrigin = process.env.PROFI_CHECKOUT_ORIGIN;
    if (!configuredOrigin) throw new Error("Кабинет не настроен");
    const origin = new URL(configuredOrigin);
    if (origin.protocol !== "https:" && !(origin.protocol === "http:" && origin.hostname === "127.0.0.1")) {
      throw new Error("Для кабинета нужен HTTPS");
    }
    const sql = getProfiDatabase();
    const handler = createAccountHandler({
      origin: origin.origin,
      verifySession: createSessionVerifier(async (statement, args) => ({
        rows: await sql.unsafe<{ auth_subject: string }[]>(statement, args),
      })),
      load: createPostgresAccountStore(async (statement, args) => sql.unsafe(statement, args)),
      revoke: createSessionRevoker(async (statement, args) => sql.unsafe(statement, args)),
    });
    return await handler(request);
  } catch {
    return Response.json({ error: "account_unavailable" }, { status: 503, headers });
  }
}
