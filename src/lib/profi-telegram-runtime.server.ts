import { getProfiDatabase } from "./profi-checkout-runtime.server";
import { createSessionIssuer } from "./profi-session.server";
import { createTelegramExchange, createTelegramLogin } from "./profi-telegram-login.server";

export async function handleTelegramLogin(request: Request, step: "start" | "complete") {
  const headers = { "Cache-Control": "no-store" };
  if (process.env.PROFI_TELEGRAM_LOGIN_ENABLED !== "1") {
    return new Response(null, { status: 404, headers });
  }
  try {
    const { PROFI_TELEGRAM_CLIENT_ID: clientId, PROFI_TELEGRAM_CLIENT_SECRET: secret,
      PROFI_CHECKOUT_ORIGIN: origin } = process.env;
    if (!clientId || !/^\d+$/.test(clientId) || !secret || !origin) throw new Error("Вход не настроен");
    const site = new URL(origin);
    if (site.protocol !== "https:") throw new Error("Для Telegram Login нужен HTTPS");
    const callback = new URL("/api/profi-login/telegram/callback", site).href;
    const sql = getProfiDatabase();
    const login = createTelegramLogin({
      clientId, callback,
      successPath: process.env.PROFI_ACCOUNT_TEST_ENABLED === "1" ? "/profi-account" : "/shop",
      exchange: createTelegramExchange(clientId, secret, callback),
      issue: createSessionIssuer(async (statement, parameters) => ({
        rows: await sql.unsafe<{ token_hash: string }[]>(statement, parameters),
      })),
    });
    return step === "start" ? login.start() : await login.complete(request);
  } catch {
    return new Response("Вход временно недоступен.", { status: 503, headers });
  }
}
