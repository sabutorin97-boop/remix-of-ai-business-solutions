import nodemailer from "nodemailer";
import { getProfiDatabase } from "./profi-checkout-runtime.server";
import { createEmailCodeService, createPostgresEmailCodeStore } from "./profi-email-code.server";
import { createEmailLoginHandler } from "./profi-email-login.server";
import { createSessionIssuer } from "./profi-session.server";

let handler: ReturnType<typeof createEmailLoginHandler> | undefined;

export async function handleEmailLogin(request: Request, step: "request" | "confirm") {
  const headers = { "Cache-Control": "no-store" };
  if (process.env.PROFI_EMAIL_TEST_ENABLED !== "1") {
    return new Response(null, { status: 404, headers });
  }
  try {
    if (!handler) {
      const {
        PROFI_CHECKOUT_ORIGIN: origin,
        PROFI_EMAIL_CODE_SECRET: secret,
        PROFI_EMAIL_TEST_RECIPIENT: recipient,
        PROFI_EMAIL_SMTP_HOST: host,
        PROFI_EMAIL_SMTP_USER: user,
        PROFI_EMAIL_SMTP_PASSWORD: pass,
      } = process.env;
      const port = Number(process.env.PROFI_EMAIL_SMTP_PORT ?? "465");
      if (!origin || new URL(origin).protocol !== "https:" || !secret || !recipient
        || !host || !user || !pass || (port !== 465 && port !== 587)) {
        throw new Error("Тестовый почтовый вход не настроен");
      }
      const allowed = recipient.trim().toLowerCase();
      const sql = getProfiDatabase();
      const store = createPostgresEmailCodeStore(async (statement, parameters) =>
        sql.unsafe<{ saved?: boolean; subject?: string | null }[]>(statement, parameters)
      );
      const smtp = nodemailer.createTransport({
        host, port, secure: port === 465, requireTLS: true, auth: { user, pass },
        connectionTimeout: 5000, greetingTimeout: 5000, socketTimeout: 8000,
      });
      const emailCode = createEmailCodeService({
        secret,
        save: (input) => input.email === allowed ? store.save(input) : Promise.resolve(false),
        consume: store.consume,
        issue: createSessionIssuer(async (statement, parameters) => ({
          rows: await sql.unsafe<{ token_hash: string }[]>(statement, parameters),
        })),
        async send(_email, code) {
          await smtp.sendMail({
            from: user, to: allowed, subject: "Тестовый код входа в Profi Market",
            text: `Твой одноразовый код: ${code}. Он действует 10 минут.`,
          });
        },
      });
      handler = createEmailLoginHandler({ origin, ...emailCode });
    }
    return await handler(request, step);
  } catch {
    return Response.json({ error: "email_login_unavailable" }, { status: 503, headers });
  }
}
