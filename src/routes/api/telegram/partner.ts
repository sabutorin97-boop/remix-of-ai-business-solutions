import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import {
  handlePartnerUpdate,
  partnerBotToken,
  PARTNER_BOT_COMMANDS,
  type TgUpdate,
} from "@/lib/partner-bot";
import { partnerPollingStatus } from "@/lib/partner-bot-polling";
import {
  getTelegramWebhookInfo,
  setTelegramMyCommands,
  setTelegramWebhook,
  telegramApiHost,
} from "@/lib/telegram";

/**
 * Вебхук партнёрского Telegram-бота.
 *
 * POST — приём апдейтов от Telegram. Подлинность проверяется заголовком
 * `X-Telegram-Bot-Api-Secret-Token`: без него адрес открыт всему интернету,
 * и любой желающий смог бы прислать апдейт от имени чужого партнёра. Поэтому
 * при незаданном секрете роут отвечает 503, а не работает «пока без проверки».
 *
 * GET — настройка: `?secret=<секрет>&action=set` ставит вебхук и команды бота,
 * `action=info` показывает текущее состояние. Сделано роутом, потому что
 * api.telegram.org с прод-IP Timeweb доступен только через релей
 * TELEGRAM_API_BASE — с ноутбука тот же setWebhook пришлось бы звать вручную.
 */

function webhookSecret(): string | undefined {
  const s = process.env.TELEGRAM_PARTNER_WEBHOOK_SECRET || process.env.TELEGRAM_WEBHOOK_SECRET;
  return s && s.trim() ? s.trim() : undefined;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const Route = createFileRoute("/api/telegram/partner")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const secret = webhookSecret();
        if (!secret) {
          console.error(
            "[partner-webhook] TELEGRAM_PARTNER_WEBHOOK_SECRET не задан — апдейты не принимаются",
          );
          return new Response("Webhook secret not configured", { status: 503 });
        }
        if (request.headers.get("x-telegram-bot-api-secret-token") !== secret) {
          return new Response("Unauthorized", { status: 401 });
        }

        let update: TgUpdate;
        try {
          update = (await request.json()) as TgUpdate;
        } catch {
          return new Response("Bad Request", { status: 400 });
        }

        // Ошибку обработки Telegram не должен видеть: на любой не-200 он
        // повторяет тот же апдейт по нарастающей и забивает лог.
        try {
          await handlePartnerUpdate(update);
        } catch (err) {
          console.error("[partner-webhook] Ошибка обработки апдейта:", err);
        }
        return new Response("ok", { status: 200 });
      },

      GET: async ({ request }: { request: Request }) => {
        const secret = webhookSecret();
        if (!secret) return json({ error: "TELEGRAM_PARTNER_WEBHOOK_SECRET не задан" }, 503);

        const url = new URL(request.url);
        if (url.searchParams.get("secret") !== secret) {
          return new Response("Unauthorized", { status: 401 });
        }

        const token = partnerBotToken();
        if (!token) return json({ error: "TELEGRAM_PARTNER_BOT_TOKEN не задан" }, 503);

        const action = url.searchParams.get("action") ?? "info";
        if (action === "ping") {
          // Проверка настроек без обращения к Telegram: показывает, что задано,
          // но не сами значения. Нужна, когда setWebhook падает по сети и не
          // понятно, дело в переменных или в канале до Telegram.
          return json({
            ok: true,
            apiHost: telegramApiHost(),
            hasPartnerToken: Boolean(process.env.TELEGRAM_PARTNER_BOT_TOKEN),
            hasMainToken: Boolean(process.env.TELEGRAM_BOT_TOKEN),
            hasOwnerChatId: Boolean(process.env.TELEGRAM_OWNER_CHAT_ID),
            hasAccessCode: Boolean(process.env.PARTNER_BOT_ACCESS_CODE),
            siteBaseUrl: process.env.SITE_BASE_URL ?? null,
            s3Configured: Boolean(process.env.S3_ENDPOINT && process.env.S3_BUCKET),
            aiConfigured: Boolean(process.env.KIE_API_KEY),
            polling: partnerPollingStatus(),
          });
        }
        try {
          if (action === "set") {
            const base = url.searchParams.get("url") || process.env.SITE_BASE_URL;
            if (!base)
              return json({ error: "Укажите ?url=https://... или задайте SITE_BASE_URL" }, 400);
            const webhookUrl = `${base.replace(/\/$/, "")}/api/telegram/partner`;
            await setTelegramWebhook(webhookUrl, {
              token,
              secretToken: secret,
              allowedUpdates: ["message", "callback_query"],
            });
            await setTelegramMyCommands(PARTNER_BOT_COMMANDS, { token });
            return json({ ok: true, webhookUrl, info: await getTelegramWebhookInfo({ token }) });
          }
          return json({ ok: true, info: await getTelegramWebhookInfo({ token }) });
        } catch (err) {
          return json({ error: err instanceof Error ? err.message : String(err) }, 502);
        }
      },
    },
  },
});
