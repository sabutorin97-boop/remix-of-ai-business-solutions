// Минимальный клиент Telegram Bot API. Только серверный код — токен бота
// никогда не должен попасть в клиентский бандл.

// api.telegram.org напрямую недоступен с прод-IP Timeweb App Platform
// (та же категория сетевой блокировки, что и с openrouter.ai — см. api/chat.ts).
// TELEGRAM_API_BASE позволяет направить трафик через внешний релей
// (Cloudflare Worker, прозрачно проксирующий на api.telegram.org).
const API_BASE = process.env.TELEGRAM_API_BASE ?? "https://api.telegram.org";

// Ботов в проекте два, и токены у них разные: основной принимает заявки с
// сайта, партнёрский (`src/lib/partner-bot.ts`) обучает партнёров. Поэтому
// каждый вызов принимает необязательный токен, а без него берётся основной.
export interface TelegramCallOptions {
  token?: string;
}

function botToken(explicit?: string): string {
  const token = explicit ?? process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("Missing TELEGRAM_BOT_TOKEN");
  return token;
}

export async function callTelegram<T = unknown>(
  method: string,
  payload: Record<string, unknown>,
  options?: TelegramCallOptions,
): Promise<T> {
  const res = await fetch(`${API_BASE}/bot${botToken(options?.token)}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = (await res.json()) as { ok: boolean; result?: T; description?: string };
  if (!data.ok) {
    throw new Error(`Telegram API ${method} failed: ${data.description ?? res.status}`);
  }
  return data.result as T;
}

export function sendTelegramMessage(
  chatId: number | string,
  text: string,
  options?: TelegramCallOptions & { replyMarkup?: unknown; disableWebPagePreview?: boolean },
) {
  return callTelegram(
    "sendMessage",
    {
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      reply_markup: options?.replyMarkup,
      link_preview_options: options?.disableWebPagePreview ? { is_disabled: true } : undefined,
    },
    options,
  );
}

/**
 * Перерисовывает уже отправленное сообщение. Так меню бота живёт в одном
 * сообщении вместо десятка новых после каждого нажатия.
 */
export function editTelegramMessageText(
  chatId: number | string,
  messageId: number,
  text: string,
  options?: TelegramCallOptions & { replyMarkup?: unknown; disableWebPagePreview?: boolean },
) {
  return callTelegram(
    "editMessageText",
    {
      chat_id: chatId,
      message_id: messageId,
      text,
      parse_mode: "HTML",
      reply_markup: options?.replyMarkup,
      link_preview_options: options?.disableWebPagePreview ? { is_disabled: true } : undefined,
    },
    options,
  );
}

/**
 * Обязательный ответ на нажатие inline-кнопки: без него у пользователя
 * несколько секунд крутится «часики» на кнопке.
 */
export function answerCallbackQuery(
  callbackQueryId: string,
  options?: TelegramCallOptions & { text?: string; showAlert?: boolean },
) {
  return callTelegram(
    "answerCallbackQuery",
    {
      callback_query_id: callbackQueryId,
      text: options?.text,
      show_alert: options?.showAlert,
    },
    options,
  );
}

/** «печатает…» — пока бот ждёт ответа модели. */
export function sendChatAction(
  chatId: number | string,
  action: "typing" | "upload_document",
  options?: TelegramCallOptions,
) {
  return callTelegram("sendChatAction", { chat_id: chatId, action }, options);
}

export function setTelegramWebhook(
  url: string,
  options?: TelegramCallOptions & { secretToken?: string; allowedUpdates?: string[] },
) {
  return callTelegram(
    "setWebhook",
    {
      url,
      secret_token: options?.secretToken,
      allowed_updates: options?.allowedUpdates,
      drop_pending_updates: true,
    },
    options,
  );
}

export function getTelegramWebhookInfo(options?: TelegramCallOptions) {
  return callTelegram("getWebhookInfo", {}, options);
}

export function setTelegramMyCommands(
  commands: { command: string; description: string }[],
  options?: TelegramCallOptions,
) {
  return callTelegram("setMyCommands", { commands }, options);
}

/** Экранирование под parse_mode=HTML: всё, что пришло от пользователя. */
export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
