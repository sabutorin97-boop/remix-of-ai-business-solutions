/**
 * Опрос Telegram вместо вебхука.
 *
 * Почему так. Сервер стоит в российской зоне, и связь с Telegram
 * односторонняя: исходящие запросы проходят через релей `TELEGRAM_API_BASE`,
 * а входящие не доходят — Telegram при доставке вебхука упирается в
 * «Connection timed out» (проверено вживую 2026-09-08, `pending_update_count`
 * рос, логи приложения оставались пустыми). Поэтому апдейты забираем сами
 * длинным опросом `getUpdates` через тот же релей.
 *
 * Цикл живёт в процессе сервера, запускается из `src/server.ts` при старте и
 * работает, пока процесс жив. Вебхук-роут остаётся на месте: если однажды
 * входящий канал откроется, достаточно поставить вебхук и выключить опрос
 * переменной PARTNER_BOT_POLLING=off.
 *
 * Важное ограничение Telegram: один и тот же бот не может одновременно
 * опрашиваться и иметь вебхук — поэтому перед первым запросом вебхук
 * удаляется. И только один процесс на бота: при втором Telegram отвечает 409.
 */
import { callTelegram, deleteTelegramWebhook } from "@/lib/telegram";
import { handlePartnerUpdate, partnerBotToken, type TgUpdate } from "@/lib/partner-bot";

/** Сколько секунд Telegram держит соединение, пока нет новых сообщений. */
const LONG_POLL_SECONDS = 25;
const ERROR_BACKOFF_MS = 5_000;
const CONFLICT_BACKOFF_MS = 15_000;

export interface PollingStatus {
  running: boolean;
  startedAt: string | null;
  lastUpdateAt: string | null;
  updatesHandled: number;
  lastError: string | null;
  lastErrorAt: string | null;
}

const status: PollingStatus = {
  running: false,
  startedAt: null,
  lastUpdateAt: null,
  updatesHandled: 0,
  lastError: null,
  lastErrorAt: null,
};

export function partnerPollingStatus(): PollingStatus {
  return { ...status };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function pollingEnabled(): boolean {
  const flag = process.env.PARTNER_BOT_POLLING?.trim().toLowerCase();
  if (flag === "off" || flag === "0" || flag === "false") return false;
  return Boolean(partnerBotToken());
}

async function fetchUpdates(token: string, offset: number): Promise<TgUpdate[]> {
  return callTelegram<TgUpdate[]>(
    "getUpdates",
    {
      offset,
      timeout: LONG_POLL_SECONDS,
      allowed_updates: ["message", "callback_query"],
    },
    { token },
  );
}

/**
 * Один проход цикла. Вынесен отдельно, чтобы его можно было прогнать в тесте
 * без бесконечного ожидания.
 */
export async function pollOnce(token: string, offset: number): Promise<number> {
  const updates = await fetchUpdates(token, offset);
  let nextOffset = offset;
  for (const update of updates) {
    nextOffset = Math.max(nextOffset, update.update_id + 1);
    try {
      await handlePartnerUpdate(update);
      status.updatesHandled += 1;
      status.lastUpdateAt = new Date().toISOString();
    } catch (err) {
      // Сбой на одном сообщении не должен останавливать очередь: сдвигаем
      // offset дальше, иначе Telegram будет присылать его снова и снова.
      console.error("[partner-polling] Ошибка обработки апдейта:", err);
    }
  }
  return nextOffset;
}

let loopStarted = false;

async function loop(token: string): Promise<void> {
  status.running = true;
  status.startedAt = new Date().toISOString();

  try {
    // getUpdates не работает, пока у бота стоит вебхук.
    await deleteTelegramWebhook({ token });
  } catch (err) {
    console.error("[partner-polling] Не удалось снять вебхук перед опросом:", err);
  }

  let offset = 0;
  for (;;) {
    try {
      offset = await pollOnce(token, offset);
      status.lastError = null;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      status.lastError = message;
      status.lastErrorAt = new Date().toISOString();
      console.error("[partner-polling] Опрос не удался:", message);
      // 409 значит, что бота уже кто-то опрашивает или вернулся вебхук:
      // ждём дольше и пробуем снова снять вебхук.
      if (message.includes("409") || message.toLowerCase().includes("conflict")) {
        try {
          await deleteTelegramWebhook({ token });
        } catch {
          // Следующая итерация всё равно попробует ещё раз.
        }
        await sleep(CONFLICT_BACKOFF_MS);
      } else {
        await sleep(ERROR_BACKOFF_MS);
      }
    }
  }
}

/** Запускает опрос один раз на процесс. Повторные вызовы игнорируются. */
export function startPartnerBotPolling(): void {
  if (loopStarted) return;
  if (!pollingEnabled()) return;
  const token = partnerBotToken();
  if (!token) return;
  loopStarted = true;
  console.log("[partner-polling] Запускаю опрос Telegram для партнёрского бота");
  void loop(token);
}
