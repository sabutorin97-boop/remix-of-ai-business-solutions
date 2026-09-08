/**
 * Прайс-лист студии для партнёров.
 *
 * Две цены на каждую позицию намеренно: «рекомендуемая» — та, которую партнёр
 * называет клиенту, она оптимальна для большинства проектов; «максимальная» —
 * потолок для сложных задач с полным функционалом. Финальную сумму студия
 * подтверждает после брифа, поэтому в разговоре это ориентир, а не оферта.
 *
 * Источник — внутренний прайс-лист (версия для партнёров и фрилансеров,
 * актуален на 2025–2026 гг.). Цены здесь в рублях, без разделителей: формат
 * собирается кодом, чтобы не расходился между разделами бота и промптом AI.
 */

export interface PriceItem {
  name: string;
  /** Рекомендуемая цена — её и называет партнёр. */
  recommended: number;
  /** Потолок для сложных проектов. */
  max: number;
  /** true — цена ежемесячная, а не за проект. */
  perMonth?: boolean;
}

export interface PriceSection {
  /** Короткий ключ для callback_data. */
  id: string;
  emoji: string;
  title: string;
  items: PriceItem[];
}

export const PRICE_SECTIONS: PriceSection[] = [
  {
    id: "web",
    emoji: "🌐",
    title: "Сайты",
    items: [
      { name: "Лендинг (1 экран)", recommended: 12500, max: 20000 },
      { name: "Лендинг (полный, 5–7 экранов)", recommended: 30000, max: 50000 },
      { name: "Сайт-визитка (3–5 стр.)", recommended: 36000, max: 60000 },
      { name: "Корпоративный сайт (10+ стр.)", recommended: 72500, max: 120000 },
      { name: "Интернет-магазин (до 50 товаров)", recommended: 90000, max: 150000 },
      { name: "Интернет-магазин (50–500 товаров)", recommended: 150000, max: 250000 },
      { name: "Портфолио / резюме-сайт", recommended: 20000, max: 35000 },
      { name: "Блог / контент-сайт", recommended: 42500, max: 70000 },
      { name: "Сайт мероприятия / ивента", recommended: 26500, max: 45000 },
      { name: "Онлайн-меню / каталог ресторана", recommended: 24000, max: 40000 },
    ],
  },
  {
    id: "bots",
    emoji: "🤖",
    title: "Боты и автоматизация",
    items: [
      { name: "Telegram-бот (простой: меню + кнопки)", recommended: 18500, max: 30000 },
      { name: "Telegram-бот (средний: оплата, рассылки)", recommended: 42500, max: 70000 },
      { name: "Telegram-бот (сложный: AI, CRM, интеграции)", recommended: 90000, max: 150000 },
      { name: "WhatsApp-бот", recommended: 60000, max: 100000 },
      { name: "Чат-бот для сайта (виджет)", recommended: 30000, max: 50000 },
      { name: "AI-ассистент / GPT-обёртка", recommended: 57500, max: 100000 },
      { name: "AI-агент OpenClaw (парсинг, анализ, диалоги)", recommended: 36500, max: 55000 },
      { name: "Автопостинг Threads / Reels-креатор", recommended: 16500, max: 25000 },
    ],
  },
  {
    id: "quiz",
    emoji: "🎯",
    title: "Квизы, формы, лид-магниты",
    items: [
      { name: "Квиз-лендинг (опросник + лидформа)", recommended: 24000, max: 40000 },
      { name: "Мультишаговая форма заявки", recommended: 15000, max: 25000 },
      { name: "Калькулятор стоимости", recommended: 30000, max: 50000 },
      { name: "Лид-магнит (мини-приложение)", recommended: 21000, max: 35000 },
    ],
  },
  {
    id: "crm",
    emoji: "📊",
    title: "CRM, дашборды и сервисы",
    items: [
      { name: "Дашборд / админ-панель", recommended: 87500, max: 150000 },
      { name: "CRM (простая: клиенты + сделки)", recommended: 115000, max: 200000 },
      { name: "Внутренний сервис компании", recommended: 140000, max: 250000 },
      { name: "MVP SaaS-продукта", recommended: 225000, max: 400000 },
      { name: "Личный кабинет для клиентов", recommended: 70000, max: 120000 },
      { name: "Букинг / система бронирований", recommended: 77500, max: 130000 },
      { name: "Автоворонка под ключ (сайт + бот + CRM)", recommended: 205000, max: 350000 },
    ],
  },
  {
    id: "care",
    emoji: "🔧",
    title: "Техподдержка и пакеты",
    items: [
      { name: "Техподдержка", recommended: 9000, max: 15000, perMonth: true },
      { name: "Разовая доработка", recommended: 6000, max: 10000 },
      { name: "SEO-настройка базовая", recommended: 15000, max: 25000 },
      { name: "Подключение аналитики и метрик", recommended: 9000, max: 15000 },
      { name: "Перенос сайта / миграция", recommended: 17500, max: 30000 },
    ],
  },
];

/** Формат «12 500 ₽» с неразрывными пробелами, чтобы сумма не рвалась на строки. */
export function formatPrice(value: number, perMonth?: boolean): string {
  // Неразрывные пробелы записаны escape-последовательностью: набранные символом
  // они невидимы в диффе и отлавливаются линтером как «irregular whitespace».
  const digits = String(value).replace(/\B(?=(\d{3})+(?!\d))/g, "\u00A0");
  return `${digits}\u00A0₽${perMonth ? "/мес" : ""}`;
}

export function findPriceSection(id: string): PriceSection | undefined {
  return PRICE_SECTIONS.find((s) => s.id === id);
}

/** Компактный прайс для системного промпта AI. */
export function priceListForPrompt(): string {
  return PRICE_SECTIONS.map(
    (section) =>
      `${section.title}:\n` +
      section.items
        .map(
          (i) =>
            `- ${i.name}: рекомендуемая ${formatPrice(i.recommended, i.perMonth)}, максимум ${formatPrice(i.max, i.perMonth)}`,
        )
        .join("\n"),
  ).join("\n");
}
