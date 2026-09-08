/**
 * Выгрузка переданных партнёрами клиентов в Google-таблицу владельца.
 *
 * Схема нарочно простая: в таблице живёт скрипт Apps Script, опубликованный
 * как веб-приложение, а мы шлём ему JSON и он дописывает строку. Так не нужны
 * ни сервисные аккаунты Google Cloud, ни хранение ключей на сервере — только
 * адрес и общий секрет в переменных окружения.
 *
 * Сбой выгрузки никогда не ломает передачу клиента: заявка уже сохранена в S3
 * и отправлена владельцу в Telegram, а строку в таблице можно дослать позже
 * командой /sync. Поэтому здесь ничего не бросается наружу.
 */

export interface SheetDealRow {
  /** Дата передачи в человеческом виде, для колонки таблицы. */
  date: string;
  partner: string;
  partnerCode: string;
  leadType: string;
  rate: string;
  client: string;
  contact: string;
  note: string;
  leadId: string;
}

const REQUEST_TIMEOUT_MS = 10_000;

export function sheetsConfigured(): boolean {
  return Boolean(process.env.SHEETS_WEBHOOK_URL?.trim());
}

/** true, если строка ушла в таблицу. Ошибки только логируются. */
export async function appendDealRow(row: SheetDealRow): Promise<boolean> {
  const url = process.env.SHEETS_WEBHOOK_URL?.trim();
  if (!url) return false;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret: process.env.SHEETS_WEBHOOK_SECRET?.trim() ?? "", ...row }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      // Apps Script отвечает редиректом на свой домен обработки — идём за ним.
      redirect: "follow",
    });
    const text = (await res.text()).trim().toLowerCase();
    if (!res.ok || text.includes("forbidden")) {
      console.error(`[sheets] Таблица не приняла строку: ${res.status} ${text.slice(0, 200)}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[sheets] Не удалось дописать строку в таблицу:", err);
    return false;
  }
}
