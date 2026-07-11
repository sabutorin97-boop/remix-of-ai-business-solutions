// ВРЕМЕННЫЙ диагностический роут для Фазы 0 — проверка, доступен ли
// api.telegram.org с прод-инстанса Timeweb (не блокирует ли DPI/WAF).
// Удалить после диагностики.
import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/debug/telegram-ping")({
  server: {
    handlers: {
      GET: async () => {
        const token = process.env.TELEGRAM_BOT_TOKEN;
        if (!token) {
          return new Response(JSON.stringify({ ok: false, stage: "env", error: "Missing TELEGRAM_BOT_TOKEN" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
        const started = Date.now();
        try {
          const res = await fetch(`https://api.telegram.org/bot${token}/getMe`, {
            signal: AbortSignal.timeout(10_000),
          });
          const tookMs = Date.now() - started;
          const data = await res.json().catch(() => null);
          return new Response(JSON.stringify({ ok: true, httpStatus: res.status, tookMs, data }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (err) {
          const tookMs = Date.now() - started;
          const e = err as Error & { cause?: unknown };
          return new Response(
            JSON.stringify({
              ok: false,
              stage: "fetch",
              tookMs,
              errorName: e.name,
              errorMessage: e.message,
              cause: e.cause ? String(e.cause) : undefined,
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }
      },
    },
  },
});
