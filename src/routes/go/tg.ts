import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";

import { channelClickReport, clickStoreConfigured, recordChannelClick } from "@/lib/click-store";
import { audienceOf, CHANNEL_PUBLIC_URL, normalizeSource } from "@/lib/telegram-channel";
import type { ChannelAudience } from "@/lib/telegram-channel";

/**
 * Переход на Telegram-канал с учётом источника: `/go/tg?s=<метка>&p=<место>`.
 *
 * Все кнопки «подписаться» ведут сюда, а не прямо в Telegram. Причина — учёт:
 * Яндекс.Метрика грузится только после согласия в баннере, поэтому по её
 * данным стоимость подписчика в рекламе посчитать нельзя. Здесь переход
 * считается на сервере, обезличенно, и лишь потом человек уходит в канал.
 *
 * Сводка: `?report=1&secret=<CLICKS_REPORT_SECRET>&day=YYYY-MM-DD`. Без
 * заданного секрета отчёт отвечает 503, а не отдаёт цифры всем подряд.
 */

/** Время ожидания записи события, чтобы переход не подвисал из-за бакета. */
const RECORD_TIMEOUT_MS = 1500;

function reportSecret(): string | undefined {
  const secret = process.env.CLICKS_REPORT_SECRET;
  return secret && secret.trim() ? secret.trim() : undefined;
}

/**
 * Ссылка канала для этой аудитории. Именованные приглашения задаются
 * переменными окружения, чтобы подставлять их без правки кода.
 *
 * Принимаем только адреса самого Telegram: переменную правит человек, и опечатка
 * или чужой адрес в ней превратили бы наш редирект в чужую посадочную.
 */
function channelUrl(audience: ChannelAudience): string {
  const ads = (process.env.TELEGRAM_CHANNEL_LINK_ADS || "").trim();
  const site = (process.env.TELEGRAM_CHANNEL_LINK_SITE || "").trim();
  const chosen = audience === "ads" ? ads || site : site || ads;
  return isTelegramUrl(chosen) ? chosen : CHANNEL_PUBLIC_URL;
}

function isTelegramUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && (url.hostname === "t.me" || url.hostname === "telegram.me");
  } catch {
    return false;
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export const Route = createFileRoute("/go/tg")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const url = new URL(request.url);

        if (url.searchParams.has("report")) {
          const secret = reportSecret();
          if (!secret) {
            return json(
              {
                ok: false,
                error: "CLICKS_REPORT_SECRET не задан, отчёт закрыт",
                hint: "добавьте переменную в окружение приложения и повторите",
              },
              503,
            );
          }
          if (url.searchParams.get("secret") !== secret) {
            return json({ ok: false, error: "неверный секрет" }, 403);
          }
          const day = url.searchParams.get("day") || today();
          if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
            return json({ ok: false, error: "день указывается как YYYY-MM-DD" }, 400);
          }
          return json({
            ok: true,
            storeConfigured: clickStoreConfigured(),
            report: await channelClickReport(day),
          });
        }

        const source = normalizeSource(url.searchParams.get("s"));
        const place = normalizeSource(url.searchParams.get("p"));
        const audience = audienceOf(source);

        // Запись не должна задерживать переход: ждём её недолго и уходим.
        await Promise.race([
          recordChannelClick({ at: new Date().toISOString(), source, place, audience }),
          new Promise((resolve) => setTimeout(resolve, RECORD_TIMEOUT_MS)),
        ]);

        return new Response(null, {
          status: 302,
          headers: {
            Location: channelUrl(audience),
            // Без этого браузер или прокси запомнят переход, и второй клик
            // того же человека мы уже не увидим.
            "Cache-Control": "no-store",
            "Referrer-Policy": "no-referrer",
          },
        });
      },
    },
  },
});
