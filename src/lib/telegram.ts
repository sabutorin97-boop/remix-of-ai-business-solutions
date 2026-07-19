// Минимальный клиент Telegram Bot API. Только серверный код — токен бота
// никогда не должен попасть в клиентский бандл.

// api.telegram.org напрямую недоступен с прод-IP Timeweb App Platform
// (та же категория сетевой блокировки, что и с openrouter.ai — см. api/chat.ts).
// TELEGRAM_API_BASE позволяет направить трафик через внешний релей
// (Cloudflare Worker, прозрачно проксирующий на api.telegram.org).
const API_BASE = process.env.TELEGRAM_API_BASE ?? "https://api.telegram.org";

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
