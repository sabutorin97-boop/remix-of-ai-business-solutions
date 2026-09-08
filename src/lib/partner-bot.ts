/**
 * Партнёрский Telegram-бот AI-Profigrup: обучает партнёров и принимает от них
 * клиентов.
 *
 * Что умеет: онбординг из 8 уроков с сохранением прогресса, каталог 42 ниш
 * с поиском, скрипты и ответы на возражения, условия партнёрства, передача
 * клиента в студию (лид уходит в тот же `leads-store`, что и заявки с сайта)
 * и вопросы к AI по продукту.
 *
 * Точка входа — `handlePartnerUpdate`, её дёргает вебхук
 * `src/routes/api/telegram/partner.ts`. Функция никогда не бросает наружу:
 * Telegram считает любой не-200 ответ сбоем и повторяет апдейт по кругу.
 *
 * Тексты и данные вынесены: `partner-training.ts` (уроки, скрипты,
 * возражения, условия) и `partner-catalog.ts` (42 ниши).
 */
import { generateText } from "ai";
import { createKieProvider } from "@/lib/ai-gateway";
import { rateLimit } from "@/lib/rate-limit";
import { createLead } from "@/lib/leads-store";
import { sendNotificationEmail } from "@/lib/email";
import {
  answerCallbackQuery,
  editTelegramMessageText,
  escapeHtml,
  sendChatAction,
  sendTelegramMessage,
} from "@/lib/telegram";
import {
  createInvite,
  findPartner,
  getPartner,
  listInvites,
  listPartners,
  redeemInvite,
  revokeInvite,
  savePartner,
  upsertPartner,
  type Partner,
  type PendingAction,
} from "@/lib/partners-store";
import {
  CATALOG,
  NICHE_FILTER,
  findNiche,
  findNichesByPhrase,
  findSection,
  priceRange,
  searchNiches,
  sectionOfNiche,
  ALL_NICHES,
  type Niche,
} from "@/lib/partner-catalog";
import {
  ASSISTANT_NAME,
  LEAD_TYPES,
  LESSONS,
  OBJECTIONS,
  PAYOUT_RULE,
  PRODUCTS_SUMMARY,
  SCRIPTS,
  SITE_URL,
  TONE_RULES,
  commissionFor,
  lessonById,
  objectionById,
  scriptById,
  termsText,
  type LeadTemperature,
} from "@/lib/partner-training";

// --- Типы Telegram (только используемые поля) -------------------------------

interface TgUser {
  id: number;
  is_bot?: boolean;
  first_name?: string;
  username?: string;
}

interface TgMessage {
  message_id: number;
  from?: TgUser;
  chat: { id: number; type: string };
  text?: string;
}

interface TgCallbackQuery {
  id: string;
  from: TgUser;
  message?: TgMessage;
  data?: string;
}

export interface TgUpdate {
  update_id: number;
  message?: TgMessage;
  callback_query?: TgCallbackQuery;
}

// --- Конфигурация -----------------------------------------------------------

/** У партнёрского бота свой токен; если его нет — работаем на основном боте. */
export function partnerBotToken(): string | undefined {
  return process.env.TELEGRAM_PARTNER_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN || undefined;
}

function accessCode(): string | undefined {
  const c = process.env.PARTNER_BOT_ACCESS_CODE;
  return c && c.trim() ? c.trim() : undefined;
}

/**
 * Метка сборки бота. Нужна для диагностики: по ответу action=ping видно, какая
 * версия реально запущена, — панель Timeweb показывает коммит ненадёжно.
 * Обновляется вручную при заметных изменениях поведения.
 */
export const BOT_VERSION = "2026-09-08 · приглашения и разговор";

/** Username партнёрского бота — из него собираются ссылки-приглашения. */
const PARTNER_BOT_USERNAME = process.env.PARTNER_BOT_USERNAME?.trim() || "AIProfigrupPartner_bot";

/** Владелец студии: у него в боте свои команды управления партнёрами. */
function isOwner(telegramId: number): boolean {
  const owner = process.env.TELEGRAM_OWNER_CHAT_ID?.trim();
  return Boolean(owner) && String(telegramId) === owner;
}

const AI_MODEL_SLUG = "gemini-3-flash";
const AI_TIMEOUT_MS = 20_000;
const AI_CHAR_LIMIT = 1200;
const TOTAL_LESSONS = LESSONS.length;

// --- Клавиатуры -------------------------------------------------------------

interface InlineButton {
  text: string;
  callback_data?: string;
  url?: string;
}

function keyboard(rows: InlineButton[][]) {
  return { inline_keyboard: rows };
}

const MENU_KEYBOARD = keyboard([
  [
    { text: "🎓 Обучение", callback_data: "learn" },
    { text: "📚 Каталог ниш", callback_data: "cat" },
  ],
  [
    { text: "💬 Скрипты", callback_data: "scripts" },
    { text: "🛡 Возражения", callback_data: "obj" },
  ],
  [{ text: "📝 Передать клиента", callback_data: "deal" }],
  [
    { text: "🤖 Спросить AI", callback_data: "ask" },
    { text: "🔎 Найти нишу", callback_data: "search" },
  ],
  [
    { text: "💰 Условия", callback_data: "terms" },
    { text: "👤 Мой профиль", callback_data: "me" },
  ],
]);

const BACK_TO_MENU = [{ text: "🏠 Меню", callback_data: "menu" }];

// --- Тексты -----------------------------------------------------------------

function menuText(partner: Partner): string {
  const done = partner.lessonsDone.length;
  const progress =
    done >= TOTAL_LESSONS ? "обучение пройдено" : `${done} из ${TOTAL_LESSONS} уроков`;
  return [
    "🏠 <b>Кабинет партнёра AI-Profigrup</b>",
    "",
    `Ваш код партнёра: <code>${partner.refCode}</code>`,
    `Обучение: ${progress}. Передано клиентов: ${partner.deals.length}.`,
    "",
    "Начните с «🎓 Обучение», дальше выбирайте ниши в каталоге и передавайте клиентов через бот.",
    "А если проще спросить словами — просто напишите мне сообщение.",
  ].join("\n");
}

function welcomeText(name: string | null): string {
  return [
    `👋 <b>Здравствуйте${name ? `, ${escapeHtml(name)}` : ""}!</b>`,
    "",
    "Это рабочий кабинет партнёра студии AI-Profigrup. Здесь всё, что нужно, чтобы продавать наши продукты:",
    "",
    "🎓 <b>Обучение</b> — 8 коротких уроков: что продаём, кому, как разговаривать.",
    "📚 <b>Каталог 42 ниш</b> — боль клиента, готовый оффер и вилка цены по каждой.",
    "💬 <b>Скрипты</b> и 🛡 <b>возражения</b> — что писать и что отвечать.",
    "📝 <b>Передать клиента</b> — заявка сразу уходит в студию с вашей меткой.",
    "🤖 <b>Спросить AI</b> — вопрос по продукту или нише в свободной форме.",
    "",
    `Со мной можно просто разговаривать: напишите словами, что нужно, и я отвечу. Меня зовут ${ASSISTANT_NAME}, я тут ваш наставник.`,
    "",
    "Начать лучше с первого урока, это минут десять.",
  ].join("\n");
}

const HELP_TEXT = [
  "❓ <b>Как пользоваться ботом</b>",
  "",
  "Проще всего — писать мне обычными словами. Спросите «с чего начать», «что ответить стоматологии» или «как объяснить цену», и я отвечу. Кнопки — для готовых материалов.",
  "",
  "<b>Команды:</b>",
  "/menu — главное меню",
  "/learn — обучение",
  "/catalog — каталог ниш",
  "/deal — передать клиента студии",
  "/ask вопрос — спросить AI по продукту",
  "/find слово — найти нишу (например: /find стоматология)",
  "/me — мой профиль и статистика",
  "/cancel — прервать текущий ввод",
  "/reset — начать разговор со мной заново",
].join("\n");

function nicheCard(n: Niche): string {
  const section = sectionOfNiche(n.id);
  return [
    `${section?.emoji ?? "•"} <i>${escapeHtml(section?.title ?? "")}</i>`,
    `<b>${n.id}. ${escapeHtml(n.name)}</b>`,
    "",
    `😖 <b>Боль:</b> ${escapeHtml(n.pain)}`,
    `🧩 <b>Первый продукт:</b> ${escapeHtml(n.product)}`,
    `🎯 <b>Оффер:</b> «${escapeHtml(n.offer)}»`,
    `💵 <b>Вилка проекта:</b> ${priceRange(n)}`,
    "",
    "✉️ <b>Как начать разговор:</b>",
    `<i>«Здравствуйте! Вижу, что ${lowerFirst(escapeHtml(n.pain))} — с этим сталкиваются почти все в вашей нише. Мы собираем ${lowerFirst(escapeHtml(n.product))}: ${lowerFirst(escapeHtml(n.offer))}. Сколько обращений в неделю сейчас приходится обрабатывать вручную?»</i>`,
    "",
    "<i>Точную сумму называет студия после бесплатного расчёта — вилка выше нужна вам для ориентира.</i>",
  ].join("\n");
}

function lowerFirst(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1);
}

function filterText(): string {
  const rows = NICHE_FILTER.map(
    (f) => `<b>${f.criterion}</b>\n✅ ${escapeHtml(f.good)}\n❌ ${escapeHtml(f.bad)}`,
  );
  return [
    "🔍 <b>Быстрый фильтр выбора ниши</b>",
    "",
    ...rows,
    "",
    "Возьмите 2–3 ниши, ближайшие к вашему опыту. Не ищите идеальную нишу — ищите реальную боль клиента.",
  ].join("\n\n");
}

function profileText(partner: Partner): string {
  const done = partner.lessonsDone.length;
  const lines = [
    "👤 <b>Мой профиль</b>",
    "",
    `Имя: ${escapeHtml(partner.firstName ?? "не указано")}`,
    partner.username ? `Telegram: @${escapeHtml(partner.username)}` : null,
    `Код партнёра: <code>${partner.refCode}</code>`,
    `Обучение: ${done} из ${TOTAL_LESSONS} уроков`,
    `Передано клиентов: ${partner.deals.length}`,
  ].filter(Boolean) as string[];
  if (partner.deals.length) {
    const warm = partner.deals.filter((d) => d.temperature === "warm").length;
    lines.push(
      `Из них тёплых: ${warm}, холодных: ${partner.deals.length - warm}`,
      "",
      "<b>Последние переданные клиенты:</b>",
    );
    for (const d of partner.deals.slice(-5).reverse()) {
      const date = new Date(d.createdAt).toLocaleDateString("ru-RU");
      const mark = LEAD_TYPES[d.temperature ?? "cold"].emoji;
      lines.push(`• ${date} ${mark} ${escapeHtml(d.clientName)} (${escapeHtml(d.contact)})`);
    }
  }
  lines.push(
    "",
    "Код партнёра называйте студии в спорных случаях — по нему видно, кто привёл клиента.",
  );
  return lines.join("\n");
}

// --- Отправка ---------------------------------------------------------------

interface Ctx {
  chatId: number;
  /** id сообщения с меню, если пришли из нажатия кнопки: его и правим. */
  messageId?: number;
  token: string;
}

async function show(ctx: Ctx, text: string, rows: InlineButton[][]): Promise<void> {
  const markup = keyboard(rows);
  if (ctx.messageId !== undefined) {
    try {
      await editTelegramMessageText(ctx.chatId, ctx.messageId, text, {
        token: ctx.token,
        replyMarkup: markup,
        disableWebPagePreview: true,
      });
      return;
    } catch (err) {
      // «message is not modified» и устаревшие сообщения — не повод молчать.
      console.warn("[partner-bot] editMessageText не удался, отправляем новое сообщение:", err);
    }
  }
  await sendTelegramMessage(ctx.chatId, text, {
    token: ctx.token,
    replyMarkup: markup,
    disableWebPagePreview: true,
  });
}

async function reply(
  ctx: Ctx,
  text: string,
  rows: InlineButton[][] = [BACK_TO_MENU],
): Promise<void> {
  await sendTelegramMessage(ctx.chatId, text, {
    token: ctx.token,
    replyMarkup: keyboard(rows),
    disableWebPagePreview: true,
  });
}

// --- Экраны -----------------------------------------------------------------

async function showMenu(ctx: Ctx, partner: Partner): Promise<void> {
  await show(ctx, menuText(partner), MENU_KEYBOARD.inline_keyboard);
}

async function showLearn(ctx: Ctx, partner: Partner): Promise<void> {
  const rows = LESSONS.map((l) => [
    {
      text: `${partner.lessonsDone.includes(l.id) ? "✅" : `${l.id}.`} ${l.title}`,
      callback_data: `l:${l.id}`,
    },
  ]);
  rows.push(BACK_TO_MENU);
  const done = partner.lessonsDone.length;
  const text = [
    "🎓 <b>Обучение партнёра</b>",
    "",
    `Пройдено ${done} из ${TOTAL_LESSONS}. Уроки короткие, идите по порядку.`,
    "",
    "После каждого урока нажимайте «Прочитал» — так бот помнит, где вы остановились.",
  ].join("\n");
  await show(ctx, text, rows);
}

async function showLesson(ctx: Ctx, partner: Partner, id: number): Promise<void> {
  const lesson = lessonById(id);
  if (!lesson) return showLearn(ctx, partner);
  const rows: InlineButton[][] = [];
  const isDone = partner.lessonsDone.includes(id);
  const next = LESSONS.find((l) => l.id === id + 1);
  rows.push([
    isDone
      ? { text: "✅ Прочитано", callback_data: `l:${id}` }
      : { text: "✔️ Прочитал", callback_data: `ld:${id}` },
    ...(next ? [{ text: `Дальше: ${next.title} →`, callback_data: `l:${next.id}` }] : []),
  ]);
  rows.push([{ text: "⬅️ К урокам", callback_data: "learn" }, ...BACK_TO_MENU]);
  await show(ctx, lesson.body, rows);
}

async function showCatalog(ctx: Ctx): Promise<void> {
  const rows: InlineButton[][] = CATALOG.map((s) => [
    { text: `${s.emoji} ${s.title} (${s.niches.length})`, callback_data: `s:${s.id}` },
  ]);
  rows.push([{ text: "🔍 Как выбрать нишу", callback_data: "filter" }]);
  rows.push([{ text: "🔎 Найти по слову", callback_data: "search" }, ...BACK_TO_MENU]);
  const text = [
    "📚 <b>Каталог ниш: 42 идеи в 7 блоках</b>",
    "",
    "По каждой нише — боль клиента, что предлагать первым, готовый оффер и вилка цены.",
    "",
    "Выберите блок или найдите нишу по слову: например «стоматология», «доставка», «ремонт».",
  ].join("\n");
  await show(ctx, text, rows);
}

async function showSection(ctx: Ctx, sectionId: string): Promise<void> {
  const section = findSection(sectionId);
  if (!section) return showCatalog(ctx);
  const rows: InlineButton[][] = section.niches.map((n) => [
    { text: `${n.id}. ${n.name} — ${priceRange(n)}`, callback_data: `n:${n.id}` },
  ]);
  rows.push([{ text: "⬅️ К блокам", callback_data: "cat" }, ...BACK_TO_MENU]);
  await show(ctx, `${section.emoji} <b>${escapeHtml(section.title)}</b>\n\nВыберите нишу:`, rows);
}

async function showNiche(ctx: Ctx, id: number): Promise<void> {
  const niche = findNiche(id);
  if (!niche) return showCatalog(ctx);
  const section = sectionOfNiche(id);
  const rows: InlineButton[][] = [
    [{ text: "📝 Передать клиента", callback_data: "deal" }],
    [{ text: "⬅️ К нишам", callback_data: section ? `s:${section.id}` : "cat" }, ...BACK_TO_MENU],
  ];
  await show(ctx, nicheCard(niche), rows);
}

async function showScripts(ctx: Ctx): Promise<void> {
  const rows: InlineButton[][] = SCRIPTS.map((s) => [
    { text: s.title, callback_data: `sc:${s.id}` },
  ]);
  rows.push(BACK_TO_MENU);
  await show(
    ctx,
    "💬 <b>Скрипты</b>\n\nГотовые формулировки под каждый этап. Адаптируйте под нишу, но держите структуру.",
    rows,
  );
}

async function showObjections(ctx: Ctx): Promise<void> {
  const rows: InlineButton[][] = OBJECTIONS.map((o) => [
    { text: o.question, callback_data: `ob:${o.id}` },
  ]);
  rows.push(BACK_TO_MENU);
  await show(
    ctx,
    "🛡 <b>Возражения</b>\n\nСхема одна: согласиться → уточнить → вернуть ценность → предложить маленький шаг.\n\nВыберите возражение:",
    rows,
  );
}

// --- Передача клиента -------------------------------------------------------

// У холодного лида два шага (имя и контакт), у тёплого три: к ним добавляется
// бриф. Тип спрашиваем первым, потому что от него зависит и набор вопросов,
// и ставка комиссии.
function dealSteps(temperature: LeadTemperature): number {
  return temperature === "warm" ? 3 : 2;
}

function dealClientPrompt(temperature: LeadTemperature): string {
  const total = dealSteps(temperature);
  return temperature === "warm"
    ? `📝 <b>Тёплый лид, шаг 1 из ${total}</b>\n\nИмя клиента и что за бизнес.\n\n<i>Пример: Марина, салон красоты в Казани</i>\n\nПрервать — /cancel`
    : `📝 <b>Холодный лид, шаг 1 из ${total}</b>\n\nФИО клиента из заявки.\n\n<i>Пример: Иванова Марина Сергеевна</i>\n\nПрервать — /cancel`;
}

function dealContactPrompt(temperature: LeadTemperature): string {
  return `📞 <b>Шаг 2 из ${dealSteps(temperature)}</b>\n\nКонтакт клиента: телефон, @username или почта.\n\n<i>Пример: +7 900 123-45-67</i>`;
}

const DEAL_BRIEF_PROMPT = [
  "📋 <b>Шаг 3 из 3 — бриф</b>",
  "",
  "Перенесите ответы клиента одним сообщением:",
  ...LEAD_TYPES.warm.checklist.map((item) => `• ${item}`),
  "",
  "Без брифа студия не сможет подтвердить, что лид тёплый, — тогда заявка уйдёт как холодная. Если брифа нет, отправьте /skip.",
].join("\n");

const DEAL_TYPE_PROMPT = [
  "📝 <b>Передача клиента</b>",
  "",
  "Сначала выберите тип лида — от него зависит ваша ставка:",
  "",
  `${LEAD_TYPES.cold.emoji} <b>${LEAD_TYPES.cold.label} — ${commissionFor("cold")}%</b>`,
  LEAD_TYPES.cold.definition,
  "",
  `${LEAD_TYPES.warm.emoji} <b>${LEAD_TYPES.warm.label} — ${commissionFor("warm")}%</b>`,
  LEAD_TYPES.warm.definition,
  "",
  `<i>${PAYOUT_RULE}</i>`,
].join("\n");

async function startDeal(ctx: Ctx, partner: Partner): Promise<void> {
  partner.pending = { kind: "deal", step: "type", draft: {} };
  await savePartner(partner);
  await reply(ctx, DEAL_TYPE_PROMPT, [
    [
      { text: `${LEAD_TYPES.cold.emoji} Холодный`, callback_data: "deal_t:cold" },
      { text: `${LEAD_TYPES.warm.emoji} Тёплый`, callback_data: "deal_t:warm" },
    ],
    [{ text: "Отмена", callback_data: "cancel" }],
  ]);
}

async function askDealClient(
  ctx: Ctx,
  partner: Partner,
  temperature: LeadTemperature,
): Promise<void> {
  partner.pending = { kind: "deal", step: "client", draft: { temperature } };
  await savePartner(partner);
  await reply(ctx, dealClientPrompt(temperature), [[{ text: "Отмена", callback_data: "cancel" }]]);
}

function dealNotificationText(
  partner: Partner,
  temperature: LeadTemperature,
  client: string,
  contact: string,
  note: string | null,
): string {
  const who = partner.username
    ? `@${escapeHtml(partner.username)}`
    : escapeHtml(partner.firstName ?? "партнёр");
  const type = LEAD_TYPES[temperature];
  return [
    `${type.emoji} <b>${type.label} от партнёра</b>`,
    "",
    `👤 Партнёр: ${who} (код ${partner.refCode}, id ${partner.telegramId})`,
    `💰 Ставка по типу: ${commissionFor(temperature)}% после оплаты заказа`,
    `🏢 Клиент: ${escapeHtml(client)}`,
    `📞 Контакт: ${escapeHtml(contact)}`,
    note ? `📋 Бриф: ${escapeHtml(note)}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

async function finishDeal(ctx: Ctx, partner: Partner, note: string | null): Promise<void> {
  const pending = partner.pending;
  if (!pending || pending.kind !== "deal") return;
  const client = pending.draft.client ?? "не указан";
  const contact = pending.draft.contact ?? "не указан";
  // Тёплый лид без брифа студия подтвердить не может, поэтому уходит как
  // холодный: партнёр предупреждён об этом на шаге брифа.
  const temperature: LeadTemperature =
    pending.draft.temperature === "warm" && note ? "warm" : "cold";

  let leadId: string | null = null;
  try {
    const lead = await createLead({
      source: "partner",
      name: client,
      contact,
      message: note,
      sourceDetails: {
        partnerTelegramId: partner.telegramId,
        partnerUsername: partner.username,
        partnerRefCode: partner.refCode,
        leadTemperature: temperature,
        commissionPercent: commissionFor(temperature),
      },
    });
    leadId = lead.id;
  } catch (err) {
    // S3 может быть не настроен или недоступен: заявку всё равно нужно
    // донести до владельца, поэтому не прерываемся.
    console.error("[partner-bot] Не удалось сохранить лид от партнёра:", err);
  }

  const text = dealNotificationText(partner, temperature, client, contact, note);
  let delivered = false;
  const ownerChatId = process.env.TELEGRAM_OWNER_CHAT_ID;
  if (ownerChatId) {
    // Уведомление шлём основным ботом: владелец с ним уже переписывался, а
    // партнёрскому боту он мог не нажимать /start — тогда отправка запрещена.
    for (const token of [process.env.TELEGRAM_BOT_TOKEN, ctx.token]) {
      if (!token) continue;
      try {
        await sendTelegramMessage(ownerChatId, text, { token });
        delivered = true;
        break;
      } catch (err) {
        console.error("[partner-bot] Не удалось уведомить владельца в Telegram:", err);
      }
    }
  }
  if (process.env.SMTP_HOST) {
    try {
      await sendNotificationEmail(
        `${LEAD_TYPES[temperature].label} от партнёра ${partner.refCode}: ${client}`,
        [
          `Партнёр: ${partner.username ? `@${partner.username}` : partner.firstName} (код ${partner.refCode})`,
          `Тип лида: ${LEAD_TYPES[temperature].label} (${commissionFor(temperature)}% после оплаты заказа)`,
          `Клиент: ${client}`,
          `Контакт: ${contact}`,
          note ? `Бриф: ${note}` : "",
        ]
          .filter(Boolean)
          .join("\n"),
      );
      delivered = true;
    } catch (err) {
      console.error("[partner-bot] Не удалось уведомить владельца по email:", err);
    }
  }

  partner.deals.push({
    leadId,
    temperature,
    clientName: client,
    contact,
    note,
    createdAt: new Date().toISOString(),
  });
  partner.pending = null;
  await savePartner(partner);

  const downgraded = pending.draft.temperature === "warm" && temperature === "cold";
  const confirmation = delivered
    ? [
        `✅ <b>Клиент передан студии как ${LEAD_TYPES[temperature].label.toLowerCase()}.</b>`,
        "",
        `Клиент: ${escapeHtml(client)}`,
        `Контакт: ${escapeHtml(contact)}`,
        `Ставка по этому лиду: ${commissionFor(temperature)}%`,
        `Ваша метка: <code>${partner.refCode}</code>`,
        downgraded
          ? "\n⚠️ Бриф не заполнен, поэтому лид ушёл как холодный. С брифом ставка была бы выше."
          : "",
        "",
        `⏳ ${PAYOUT_RULE}`,
        "",
        "Что дальше: студия свяжется с клиентом, сделает бесплатный аудит и посчитает стоимость.",
        "Предупредите клиента, что с ним свяжутся — так разговор пройдёт легче.",
      ]
        .filter(Boolean)
        .join("\n")
    : [
        "⚠️ <b>Заявка записана, но уведомление студии не ушло.</b>",
        "",
        `Клиент: ${escapeHtml(client)}`,
        `Контакт: ${escapeHtml(contact)}`,
        "",
        "Напишите руководителю напрямую, чтобы клиент не потерялся.",
      ].join("\n");
  await reply(ctx, confirmation);
}

// --- AI-помощник ------------------------------------------------------------

function catalogForPrompt(): string {
  return ALL_NICHES.map(
    (n) =>
      `${n.id}. ${n.name} | боль: ${n.pain} | продукт: ${n.product} | оффер: ${n.offer} | ${priceRange(n)}`,
  ).join("\n");
}

function aiSystemPrompt(partner: Partner): string {
  const done = partner.lessonsDone.length;
  const who = partner.firstName ? `Партнёра зовут ${partner.firstName}.` : "";
  return `Ты — ${ASSISTANT_NAME}, AI-наставник партнёров студии AI-Profigrup. Партнёры продают наши услуги бизнесу, а ты помогаешь им: подсказываешь, что написать клиенту, какая ниша подойдёт, как объяснить продукт простыми словами. И просто разговариваешь по-человечески, когда это уместно.

${who} Пройдено уроков: ${done} из ${TOTAL_LESSONS}. Передано клиентов в студию: ${partner.deals.length}.

${TONE_RULES}

ПРОДУКТЫ И ФАКТЫ (единственный источник, ничего не додумывай):
${PRODUCTS_SUMMARY}
Сайт: ${SITE_URL}

КАТАЛОГ НИШ (вилки цен — ориентир для разговора, не прайс):
${catalogForPrompt()}`;
}

const CHAT_HISTORY_TURNS = 8;
const CHAT_TURN_CHARS = 700;

/**
 * Разговор с наставником. История хранится у партнёра, поэтому бот помнит,
 * о чём шла речь: без этого каждый ответ выглядит как реплика незнакомца.
 */
async function answerWithAi(
  ctx: Ctx,
  partner: Partner,
  question: string,
  extraRows: InlineButton[][] = [],
): Promise<void> {
  const key = process.env.KIE_API_KEY;
  if (!key) {
    await reply(
      ctx,
      "Сейчас не могу ответить своими словами: не настроен доступ к AI. Загляните пока в «🎓 Обучение», «💬 Скрипты» или «🛡 Возражения» — там разобраны частые вопросы.",
      [...extraRows, BACK_TO_MENU],
    );
    return;
  }
  const rl = rateLimit("partner_ai", String(partner.telegramId), { windowMs: 3_600_000, max: 40 });
  if (!rl.ok) {
    await reply(
      ctx,
      "Столько вопросов подряд я за час не осилю — давайте продолжим чуть позже. А пока загляните в «💬 Скрипты», там есть готовые формулировки.",
      [BACK_TO_MENU],
    );
    return;
  }

  try {
    await sendChatAction(ctx.chatId, "typing", { token: ctx.token });
  } catch {
    // «печатает…» — украшение, его сбой не должен ломать ответ.
  }

  const history = partner.chat ?? [];
  try {
    const provider = createKieProvider(key, AI_MODEL_SLUG);
    const result = await generateText({
      model: provider(AI_MODEL_SLUG),
      system: aiSystemPrompt(partner),
      messages: [
        ...history.map((turn) => ({
          role: turn.role === "user" ? ("user" as const) : ("assistant" as const),
          content: turn.text,
        })),
        { role: "user" as const, content: question },
      ],
      maxOutputTokens: 600,
      abortSignal: AbortSignal.timeout(AI_TIMEOUT_MS),
    });
    const text = result.text.trim();
    if (!text) throw new Error("empty AI response");
    const trimmed =
      text.length > AI_CHAR_LIMIT ? `${text.slice(0, AI_CHAR_LIMIT).trimEnd()}…` : text;

    partner.chat = [
      ...history,
      { role: "user" as const, text: question.slice(0, CHAT_TURN_CHARS) },
      { role: "bot" as const, text: trimmed.slice(0, CHAT_TURN_CHARS) },
    ].slice(-CHAT_HISTORY_TURNS);
    await savePartner(partner);

    await reply(ctx, escapeHtml(trimmed), [...extraRows, BACK_TO_MENU]);
  } catch (err) {
    console.error("[partner-bot] AI-ответ не получен:", err);
    await reply(
      ctx,
      "Не получилось ответить: сервис не отозвался вовремя. Спросите ещё раз через минуту, а если срочно — посмотрите «💬 Скрипты» и «🛡 Возражения».",
      [...extraRows, BACK_TO_MENU],
    );
  }
}

// --- Поиск ------------------------------------------------------------------

async function showSearchResults(ctx: Ctx, query: string): Promise<void> {
  const found = searchNiches(query);
  if (!found.length) {
    await reply(
      ctx,
      `🔎 По запросу «${escapeHtml(query)}» ниша не нашлась.\n\nПопробуйте другое слово или спросите AI — он подскажет, какая ниша ближе.`,
      [
        [{ text: "🤖 Спросить AI", callback_data: "ask" }],
        [{ text: "📚 Каталог", callback_data: "cat" }, ...BACK_TO_MENU],
      ],
    );
    return;
  }
  const rows: InlineButton[][] = found.map((n) => [
    { text: `${n.id}. ${n.name} — ${priceRange(n)}`, callback_data: `n:${n.id}` },
  ]);
  rows.push([{ text: "📚 Весь каталог", callback_data: "cat" }, ...BACK_TO_MENU]);
  await reply(ctx, `🔎 По запросу «${escapeHtml(query)}» подходит:`, rows);
}

// --- Обработка ввода в состоянии ожидания -----------------------------------

async function handlePending(
  ctx: Ctx,
  partner: Partner,
  pending: PendingAction,
  text: string,
): Promise<boolean> {
  if (pending.kind === "ask") {
    partner.pending = null;
    await savePartner(partner);
    await answerWithAi(ctx, partner, text);
    return true;
  }

  if (pending.kind === "search") {
    partner.pending = null;
    await savePartner(partner);
    await showSearchResults(ctx, text);
    return true;
  }

  if (pending.kind === "deal") {
    const temperature: LeadTemperature = pending.draft.temperature ?? "cold";
    if (pending.step === "type") {
      // Тип выбирается кнопкой; текстом сюда попадают редко, поэтому просто
      // повторяем вопрос вместо того, чтобы гадать.
      await reply(ctx, DEAL_TYPE_PROMPT, [
        [
          { text: `${LEAD_TYPES.cold.emoji} Холодный`, callback_data: "deal_t:cold" },
          { text: `${LEAD_TYPES.warm.emoji} Тёплый`, callback_data: "deal_t:warm" },
        ],
        [{ text: "Отмена", callback_data: "cancel" }],
      ]);
      return true;
    }
    if (pending.step === "client") {
      partner.pending = {
        kind: "deal",
        step: "contact",
        draft: { ...pending.draft, client: text.slice(0, 300) },
      };
      await savePartner(partner);
      await reply(ctx, dealContactPrompt(temperature), [
        [{ text: "Отмена", callback_data: "cancel" }],
      ]);
      return true;
    }
    if (pending.step === "contact") {
      const draft = { ...pending.draft, contact: text.slice(0, 300) };
      if (temperature === "cold") {
        // У холодного лида по определению есть только ФИО и контакт —
        // брифа не ждём и заканчиваем на втором шаге.
        partner.pending = { kind: "deal", step: "note", draft };
        await savePartner(partner);
        await finishDeal(ctx, partner, null);
        return true;
      }
      partner.pending = { kind: "deal", step: "note", draft };
      await savePartner(partner);
      await reply(ctx, DEAL_BRIEF_PROMPT, [[{ text: "Пропустить", callback_data: "deal_skip" }]]);
      return true;
    }
    await finishDeal(ctx, partner, text.slice(0, 2000));
    return true;
  }

  return false;
}

// --- Роутинг кнопок ---------------------------------------------------------

async function handleCallbackData(ctx: Ctx, partner: Partner, data: string): Promise<void> {
  if (data === "menu") return showMenu(ctx, partner);
  if (data === "learn") return showLearn(ctx, partner);
  if (data === "cat") return showCatalog(ctx);
  if (data === "filter")
    return show(ctx, filterText(), [
      [{ text: "📚 К блокам", callback_data: "cat" }, ...BACK_TO_MENU],
    ]);
  if (data === "scripts") return showScripts(ctx);
  if (data === "obj") return showObjections(ctx);
  if (data === "terms") return show(ctx, termsText(), [BACK_TO_MENU]);
  if (data === "me") return show(ctx, profileText(partner), [BACK_TO_MENU]);
  if (data === "help") return show(ctx, HELP_TEXT, [BACK_TO_MENU]);

  if (data === "deal") {
    return startDeal({ ...ctx, messageId: undefined }, partner);
  }
  if (data.startsWith("deal_t:")) {
    const temperature: LeadTemperature = data.endsWith("warm") ? "warm" : "cold";
    return askDealClient({ ...ctx, messageId: undefined }, partner, temperature);
  }
  if (data === "deal_skip") {
    if (partner.pending?.kind === "deal" && partner.pending.step === "note") {
      return finishDeal({ ...ctx, messageId: undefined }, partner, null);
    }
    return showMenu(ctx, partner);
  }
  if (data === "cancel") {
    partner.pending = null;
    await savePartner(partner);
    return show(ctx, "Отменено.", MENU_KEYBOARD.inline_keyboard);
  }
  if (data === "ask") {
    partner.pending = { kind: "ask" };
    await savePartner(partner);
    return reply(
      { ...ctx, messageId: undefined },
      "🤖 Задайте вопрос по продукту, нише или разговору с клиентом — отвечу как наставник.\n\n<i>Например: «Что ответить стоматологии, у которой уже есть сайт?»</i>",
      [[{ text: "Отмена", callback_data: "cancel" }]],
    );
  }
  if (data === "search") {
    partner.pending = { kind: "search" };
    await savePartner(partner);
    return reply(
      { ...ctx, messageId: undefined },
      "🔎 Напишите слово — найду подходящие ниши.\n\n<i>Например: доставка, стоматология, ремонт, обучение</i>",
      [[{ text: "Отмена", callback_data: "cancel" }]],
    );
  }

  const [prefix, arg] = data.split(":");
  if (prefix === "l" && arg) return showLesson(ctx, partner, Number(arg));
  if (prefix === "ld" && arg) {
    const id = Number(arg);
    if (!partner.lessonsDone.includes(id)) {
      partner.lessonsDone = [...partner.lessonsDone, id].sort((a, b) => a - b);
      await savePartner(partner);
    }
    const next = LESSONS.find((l) => l.id === id + 1);
    if (next) return showLesson(ctx, partner, next.id);
    return show(
      ctx,
      "🎉 <b>Обучение пройдено.</b>\n\nТеперь по делу: выберите 2–3 ниши в каталоге, соберите список из 20 бизнесов и напишите первым десяти по скрипту первого касания.",
      [
        [{ text: "📚 Каталог ниш", callback_data: "cat" }],
        [{ text: "💬 Скрипты", callback_data: "scripts" }, ...BACK_TO_MENU],
      ],
    );
  }
  if (prefix === "s" && arg) return showSection(ctx, arg);
  if (prefix === "n" && arg) return showNiche(ctx, Number(arg));
  if (prefix === "sc" && arg) {
    const script = scriptById(arg);
    if (script)
      return show(ctx, script.body, [
        [{ text: "⬅️ К скриптам", callback_data: "scripts" }, ...BACK_TO_MENU],
      ]);
    return showScripts(ctx);
  }
  if (prefix === "ob" && arg) {
    const objection = objectionById(arg);
    if (objection) {
      const text = [
        `🛡 <b>«${escapeHtml(objection.question)}»</b>`,
        "",
        objection.answer,
        "",
        "<i>Схема: согласиться → уточнить → вернуть ценность → предложить маленький шаг.</i>",
      ].join("\n");
      return show(ctx, text, [
        [{ text: "⬅️ К возражениям", callback_data: "obj" }, ...BACK_TO_MENU],
      ]);
    }
    return showObjections(ctx);
  }

  return showMenu(ctx, partner);
}

// --- Роутинг команд и текста ------------------------------------------------

async function handleText(ctx: Ctx, partner: Partner, rawText: string): Promise<void> {
  const text = rawText.trim();

  if (isOwner(partner.telegramId) && text.startsWith("/")) {
    const handled = await handleOwnerCommand(ctx, text);
    if (handled) return;
  }

  if (text === "/cancel") {
    partner.pending = null;
    await savePartner(partner);
    await reply(ctx, "Отменено.");
    return showMenu({ ...ctx, messageId: undefined }, partner);
  }
  if (text === "/skip" && partner.pending?.kind === "deal" && partner.pending.step === "note") {
    return finishDeal(ctx, partner, null);
  }

  if (partner.pending && !text.startsWith("/")) {
    const handled = await handlePending(ctx, partner, partner.pending, text);
    if (handled) return;
  }

  const [command, ...restParts] = text.split(/\s+/);
  const rest = restParts.join(" ").trim();

  switch (command) {
    case "/start":
      partner.pending = null;
      await savePartner(partner);
      await reply(ctx, welcomeText(partner.firstName), []);
      return showMenu({ ...ctx, messageId: undefined }, partner);
    case "/menu":
      return showMenu({ ...ctx, messageId: undefined }, partner);
    case "/help":
      return reply(ctx, HELP_TEXT);
    case "/learn":
      return showLearn({ ...ctx, messageId: undefined }, partner);
    case "/catalog":
      return showCatalog({ ...ctx, messageId: undefined });
    case "/reset":
      partner.chat = [];
      partner.pending = null;
      await savePartner(partner);
      return reply(ctx, "Разговор начат с чистого листа. О чём поговорим?");
    case "/me":
      return reply(ctx, profileText(partner));
    case "/terms":
      return reply(ctx, termsText());
    case "/deal":
      return startDeal(ctx, partner);
    case "/ask":
      if (!rest) {
        partner.pending = { kind: "ask" };
        await savePartner(partner);
        return reply(ctx, "🤖 Напишите вопрос следующим сообщением.", [
          [{ text: "Отмена", callback_data: "cancel" }],
        ]);
      }
      return answerWithAi(ctx, partner, rest);
    case "/find":
    case "/search":
      if (!rest) {
        partner.pending = { kind: "search" };
        await savePartner(partner);
        return reply(ctx, "🔎 Напишите слово для поиска ниши.", [
          [{ text: "Отмена", callback_data: "cancel" }],
        ]);
      }
      return showSearchResults(ctx, rest);
  }

  if (text.startsWith("/")) {
    return reply(
      ctx,
      `Такой команды у меня нет. Но со мной можно и без команд — просто напишите словами.\n\n${HELP_TEXT}`,
    );
  }

  // Свободный текст — это разговор с наставником, а не поиск по каталогу.
  // Раньше сюда попадало «привет», и бот отвечал списком ниш, из-за чего
  // выглядел бездушным. Ниши ищет отдельная кнопка и команда /find, а здесь
  // они лишь подсказками под ответом, и только при точном совпадении.
  const related = findNichesByPhrase(text);
  const hints: InlineButton[][] = related.map((n) => [
    { text: `${n.id}. ${n.name} — ${priceRange(n)}`, callback_data: `n:${n.id}` },
  ]);
  return answerWithAi(ctx, partner, text, hints);
}

// --- Управление партнёрами (только владелец) --------------------------------

const OWNER_HELP = [
  "🛠 <b>Управление партнёрами</b>",
  "",
  "/invite Имя Фамилия — создать личное приглашение и ссылку",
  "/invites — неиспользованные приглашения",
  "/partners — список партнёров и их результаты",
  "/partner код — карточка партнёра со всеми переданными клиентами",
  "/block код — закрыть доступ (история сохраняется)",
  "/unblock код — вернуть доступ",
  "/admin — эта подсказка",
  "",
  "Вместо кода можно указать @username или числовой id партнёра.",
].join("\n");

function partnerLine(index: number, p: Partner): string {
  const warm = p.deals.filter((d) => d.temperature === "warm").length;
  const cold = p.deals.length - warm;
  const state =
    p.status === "blocked"
      ? "🚫 доступ закрыт"
      : p.status === "pending_code"
        ? "⏳ не вошёл"
        : "✅ активен";
  const name = escapeHtml(p.label ?? p.firstName ?? "без имени");
  const who = p.username ? ` @${escapeHtml(p.username)}` : "";
  return [
    `${index}. <b>${name}</b>${who} · <code>${p.refCode}</code>`,
    `   ${state} · уроков ${p.lessonsDone.length}/${TOTAL_LESSONS} · клиентов ${p.deals.length} (🔥 ${warm} / 🧊 ${cold})`,
  ].join("\n");
}

function partnerCard(p: Partner): string {
  const warm = p.deals.filter((d) => d.temperature === "warm").length;
  const lines = [
    `👤 <b>${escapeHtml(p.label ?? p.firstName ?? "Партнёр")}</b>`,
    p.username ? `Telegram: @${escapeHtml(p.username)}` : null,
    `Код: <code>${p.refCode}</code> · id ${p.telegramId}`,
    `Статус: ${p.status === "blocked" ? "доступ закрыт" : p.status === "pending_code" ? "ещё не вошёл" : "активен"}`,
    `Вошёл по приглашению: ${p.inviteCode ? `<code>${p.inviteCode}</code>` : "общий код"}`,
    `Обучение: ${p.lessonsDone.length} из ${TOTAL_LESSONS}`,
    `Клиентов передано: ${p.deals.length} (🔥 ${warm} / 🧊 ${p.deals.length - warm})`,
  ].filter(Boolean) as string[];
  if (p.deals.length) {
    lines.push("", "<b>Переданные клиенты:</b>");
    for (const d of p.deals.slice(-15).reverse()) {
      const date = new Date(d.createdAt).toLocaleDateString("ru-RU");
      const mark = LEAD_TYPES[d.temperature ?? "cold"].emoji;
      const rate = commissionFor(d.temperature ?? "cold");
      lines.push(
        `• ${date} ${mark} ${escapeHtml(d.clientName)} — ${escapeHtml(d.contact)} · ${rate}%`,
      );
      if (d.note) lines.push(`   <i>${escapeHtml(d.note.slice(0, 200))}</i>`);
    }
  }
  return lines.join("\n");
}

/** Возвращает true, если сообщение было командой владельца и уже обработано. */
async function handleOwnerCommand(ctx: Ctx, text: string): Promise<boolean> {
  const [command, ...rest] = text.split(/\s+/);
  const arg = rest.join(" ").trim();

  switch (command) {
    case "/admin":
      await reply(ctx, OWNER_HELP, []);
      return true;

    case "/invite": {
      if (!arg) {
        await reply(ctx, "Укажите имя партнёра: <code>/invite Иван Петров</code>", []);
        return true;
      }
      const invite = await createInvite(arg);
      await reply(
        ctx,
        [
          `🎟 <b>Приглашение для «${escapeHtml(invite.label)}»</b>`,
          "",
          `Код: <code>${invite.code}</code>`,
          `Ссылка: https://t.me/${PARTNER_BOT_USERNAME}?start=${invite.code}`,
          "",
          "Перешлите ссылку партнёру: по ней кабинет откроется сразу, код вводить не придётся.",
          "Приглашение одноразовое и закрепится за тем, кто войдёт по нему первым.",
        ].join("\n"),
        [],
      );
      return true;
    }

    case "/invites": {
      const invites = (await listInvites()).filter((i) => i.usedBy === null);
      await reply(
        ctx,
        invites.length
          ? [
              "🎟 <b>Неиспользованные приглашения</b>",
              "",
              ...invites.map(
                (i) =>
                  `• <code>${i.code}</code> — ${escapeHtml(i.label)} (от ${new Date(i.createdAt).toLocaleDateString("ru-RU")})`,
              ),
            ].join("\n")
          : "Неиспользованных приглашений нет. Новое создаётся командой <code>/invite Имя</code>.",
        [],
      );
      return true;
    }

    case "/partners": {
      const partners = await listPartners();
      if (!partners.length) {
        await reply(ctx, "Партнёров пока нет. Создайте приглашение: <code>/invite Имя</code>", []);
        return true;
      }
      const totalDeals = partners.reduce((sum, p) => sum + p.deals.length, 0);
      await reply(
        ctx,
        [
          `👥 <b>Партнёры: ${partners.length}</b>, клиентов передано: ${totalDeals}`,
          "",
          ...partners.map((p, i) => partnerLine(i + 1, p)),
          "",
          "Карточка партнёра: <code>/partner код</code>",
        ].join("\n"),
        [],
      );
      return true;
    }

    case "/partner": {
      if (!arg) {
        await reply(ctx, "Укажите код, @username или id: <code>/partner AP-B88F</code>", []);
        return true;
      }
      const partner = await findPartner(arg);
      await reply(
        ctx,
        partner ? partnerCard(partner) : `Партнёр «${escapeHtml(arg)}» не найден.`,
        [],
      );
      return true;
    }

    case "/block":
    case "/unblock": {
      if (!arg) {
        await reply(ctx, `Укажите код, @username или id: <code>${command} AP-B88F</code>`, []);
        return true;
      }
      const partner = await findPartner(arg);
      if (!partner) {
        await reply(ctx, `Партнёр «${escapeHtml(arg)}» не найден.`, []);
        return true;
      }
      const blocking = command === "/block";
      partner.status = blocking ? "blocked" : "active";
      // Прерываем незавершённый ввод, чтобы после разблокировки партнёр не
      // оказался посреди старой формы передачи клиента.
      partner.pending = null;
      await savePartner(partner);
      if (blocking && partner.inviteCode) await revokeInvite(partner.inviteCode);
      await reply(
        ctx,
        blocking
          ? [
              `🚫 Доступ закрыт: <b>${escapeHtml(partner.label ?? partner.firstName ?? partner.refCode)}</b>.`,
              "",
              "История переданных клиентов сохранена, она видна в карточке партнёра.",
              "Приглашение отозвано: по старой ссылке войти больше нельзя.",
            ].join("\n")
          : `✅ Доступ возвращён: <b>${escapeHtml(partner.label ?? partner.firstName ?? partner.refCode)}</b>.`,
        [],
      );
      return true;
    }
  }
  return false;
}

// --- Точка входа ------------------------------------------------------------

export async function handlePartnerUpdate(update: TgUpdate): Promise<void> {
  const token = partnerBotToken();
  if (!token) {
    console.error("[partner-bot] Нет токена: задайте TELEGRAM_PARTNER_BOT_TOKEN");
    return;
  }

  const from = update.callback_query?.from ?? update.message?.from;
  const chatId = update.callback_query?.message?.chat.id ?? update.message?.chat.id;
  if (!from || from.is_bot || chatId === undefined) return;

  // Групповые чаты бот не обслуживает: кабинет партнёра личный.
  const chatType = update.callback_query?.message?.chat.type ?? update.message?.chat.type;
  if (chatType && chatType !== "private") return;

  const throttle = rateLimit("partner_bot", String(from.id), { windowMs: 60_000, max: 40 });
  if (!throttle.ok) return;

  // Вход закрыт, если задан общий код или выписано хотя бы одно приглашение.
  // Пока нет ни того ни другого, бот открыт — это состояние «только поставили».
  const gated = Boolean(accessCode()) || (await listInvites()).length > 0;
  const { partner, isNew } = await upsertPartner(from, gated && !isOwner(from.id));

  const baseCtx: Ctx = { chatId, token };

  if (partner.status === "blocked") {
    if (update.callback_query) {
      await answerCallbackQuery(update.callback_query.id, { token });
    }
    await sendTelegramMessage(
      chatId,
      "🚫 <b>Доступ к кабинету закрыт.</b>\n\nЕсли это недоразумение, напишите вашему руководителю в студии.",
      { token },
    );
    return;
  }

  // Код принимаем и в диплинке `/start КОД`, и обычным сообщением. Личное
  // приглашение важнее общего кода: по нему видно, кто именно вошёл.
  if (partner.status === "pending_code") {
    const text = update.message?.text?.trim() ?? "";
    const supplied = text.startsWith("/start ") ? text.slice("/start ".length).trim() : text;
    const invite = supplied ? await redeemInvite(supplied, from.id) : null;
    const generalCode = accessCode();
    const unlocked =
      invite !== null || (Boolean(generalCode) && supplied === generalCode) || !gated;
    if (unlocked) {
      partner.status = "active";
      partner.pending = null;
      if (invite) {
        partner.label = invite.label;
        partner.inviteCode = invite.code;
      }
      await savePartner(partner);
      await sendTelegramMessage(
        chatId,
        `✅ <b>Доступ открыт.</b>\n\n${welcomeText(partner.firstName)}`,
        {
          token,
        },
      );
      await showMenu(baseCtx, partner);
      return;
    }
    if (update.callback_query) {
      await answerCallbackQuery(update.callback_query.id, { token });
    }
    const wrongAttempt = text.length > 0 && !text.startsWith("/start");
    await sendTelegramMessage(
      chatId,
      wrongAttempt
        ? "🔒 Код не подошёл. Проверьте раскладку и пробелы или попросите новый код у руководителя."
        : "🔒 <b>Кабинет партнёра AI-Profigrup</b>\n\nДоступ по личному приглашению. Отправьте код, который выдал руководитель.",
      { token },
    );
    return;
  }

  if (update.callback_query) {
    const cq = update.callback_query;
    try {
      await answerCallbackQuery(cq.id, { token });
    } catch (err) {
      console.warn("[partner-bot] answerCallbackQuery не удался:", err);
    }
    const ctx: Ctx = { ...baseCtx, messageId: cq.message?.message_id };
    await handleCallbackData(ctx, partner, cq.data ?? "menu");
    return;
  }

  const text = update.message?.text;
  if (!text) {
    await sendTelegramMessage(chatId, "Я понимаю текст и кнопки. Откройте меню командой /menu.", {
      token,
    });
    return;
  }

  if (isNew && !text.startsWith("/start")) {
    // Первое сообщение не командой — всё равно показываем приветствие,
    // иначе человек попадает сразу в поиск и не понимает, куда пришёл.
    await sendTelegramMessage(chatId, welcomeText(partner.firstName), { token });
  }

  await handleText(baseCtx, partner, text);
}

/** Список команд для меню Telegram — ставится вебхук-роутом при настройке. */
export const PARTNER_BOT_COMMANDS = [
  { command: "menu", description: "Главное меню" },
  { command: "learn", description: "Обучение партнёра" },
  { command: "catalog", description: "Каталог 42 ниш" },
  { command: "deal", description: "Передать клиента студии" },
  { command: "ask", description: "Спросить AI по продукту" },
  { command: "find", description: "Найти нишу по слову" },
  { command: "me", description: "Мой профиль" },
  { command: "terms", description: "Условия партнёрства" },
  { command: "reset", description: "Начать разговор заново" },
  { command: "help", description: "Как пользоваться ботом" },
];
