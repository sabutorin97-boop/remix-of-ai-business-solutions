/**
 * Telegram-канал «AI Продажи» — единая точка для всех ссылок на него.
 *
 * Со страниц сайта на канал ведёт не прямая ссылка, а свой адрес-редирект
 * `/go/tg?s=<метка>`: он считает переход на сервере и только потом отправляет
 * человека в Telegram. Прямая ссылка так не работает — Яндекс.Метрика грузится
 * только после согласия в баннере, поэтому клики части аудитории не видны.
 *
 * Сами ссылки на канал здесь не лежат: их знает только серверный роут
 * `src/routes/go/tg.ts`, он берёт их из переменных окружения. Так именованные
 * приглашения (`t.me/+…`) подставляются без правки кода и без пересборки.
 */

export const CHANNEL_NAME = "@ai_prodazhi_pro";

/** Публичная ссылка на канал. Запасной вариант, если приглашений ещё нет. */
export const CHANNEL_PUBLIC_URL = "https://t.me/ai_prodazhi_pro";

/**
 * Аудитория перехода. У канала нет параметра `?start=`, как у бота, поэтому
 * платных подписчиков от бесплатных отделяют разные пригласительные ссылки:
 * Telegram показывает по каждой, сколько человек по ней вступило.
 */
export type ChannelAudience = "ads" | "site";

/**
 * Метки, которые считаются платным трафиком. Всё остальное — бесплатное:
 * подвал, блог, посты в канале, подпись в профиле.
 */
const PAID_SOURCES = new Set(["ads", "direct", "vk", "yandex", "target"]);

/** Метка источника в адресе: латиница, цифры, дефис и подчёркивание. */
export function normalizeSource(raw: string | null | undefined): string {
  const value = (raw ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 24);
  return value || "unknown";
}

/** Какая пригласительная ссылка нужна этой метке. */
export function audienceOf(source: string): ChannelAudience {
  return PAID_SOURCES.has(source) ? "ads" : "site";
}

/**
 * Адрес кнопки «подписаться». `source` говорит, откуда пришёл человек,
 * `place` — где именно на странице он нажал.
 */
export function channelHref(source: string, place?: string): string {
  const params = new URLSearchParams({ s: source });
  if (place) params.set("p", place);
  return `/go/tg?${params.toString()}`;
}
