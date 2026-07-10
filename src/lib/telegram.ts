// Минимальный клиент Telegram Bot API. Только серверный код — токен бота
// никогда не должен попасть в клиентский бандл.

const API_BASE = "https://api.telegram.org";

function botToken(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("Missing TELEGRAM_BOT_TOKEN");
  return token;
}

async function callTelegram<T = unknown>(method: string, payload: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${API_BASE}/bot${botToken()}/${method}`, {
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

export function sendTelegramMessage(chatId: number | string, text: string, options?: { replyMarkup?: unknown }) {
  return callTelegram("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    reply_markup: options?.replyMarkup,
  });
}
