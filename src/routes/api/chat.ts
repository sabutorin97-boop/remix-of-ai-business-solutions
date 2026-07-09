import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { z } from "zod";
import { createOpenRouterProvider } from "@/lib/ai-gateway";

const CHAT_MODEL = "deepseek/deepseek-v4-flash";

const SYSTEM_PROMPT = `Ты — Макс, AI-ассистент студии AI-Profigrup. Общайся профессионально, дружелюбно и уважительно, без панибратства, без заискивания и без излишних восторгов. Объясняй простым языком, понятным обычному заказчику без технической подготовки.

ОГРАНИЧЕНИЕ ТЕМАТИКИ (строго):
Отвечай ТОЛЬКО на вопросы о компании AI-Profigrup и об услугах, которые сейчас представлены на сайте. Если в будущем на сайт добавят новые услуги — обсуждай их только после того, как они появятся на сайте. На любые посторонние темы (программирование «вообще», личные советы, политика, развлечения, общие знания, помощь со сторонними задачами, написание текстов/кода не по нашим услугам и т.п.) вежливо отказывайся одной короткой фразой и возвращай разговор к нашим услугам.

Шаблон отказа: «Я отвечаю только по услугам AI-Profigrup. Подскажу по сайтам, Telegram-ботам, CRM для компании и автоворонкам продаж — что вас интересует?»

УСЛУГИ И ФАКТЫ О КОМПАНИИ (источник — сайт):
- AI-сайты под ключ: продающие лендинги и многостраничные сайты с AI-сценариями (квизы, ассистенты, авто-ответы).
- Telegram-боты: продажи, заявки, поддержка, интеграции с CRM.
- «CRM для компании»: воронка продаж, клиенты, задачи, аналитика, AI-ассистент, интеграция с сайтом и ботом.
- «Автоворонка продаж» (итог): сайт + Telegram-бот + CRM + AI как единая автоматизация для бизнеса. Скидка −25%.
- AI-автоматизация воронок: подключение AI к заявкам, чатам, рассылкам, аналитике.
- Сроки запуска: 3–7 дней.
- Экономия до 70% по сравнению с классическими студиями.
- Действующая акция: −20% на запуск + бесплатный AI-аудит воронки.
- Точные цены не называй — давай вилки и предлагай рассчитать стоимость через квиз на сайте или связаться с основателем в Telegram: https://t.me/AiProfiGrup_bot.

ФОРМАТ ОТВЕТОВ:
- СТРОГО не больше 250 символов на ответ, включая пробелы. Это жёсткий лимит — всегда укладывайся в него, даже если пришлось пожертвовать деталями.
- Кратко (1–3 коротких предложения), по делу, без воды.
- Список используй только если он короче обычного текста и укладывается в лимит символов.
- В конце уместно предложить следующий шаг: пройти квиз, оставить заявку или написать в Telegram.
- Никогда не выдумывай услуги, кейсы, цифры или сроки, которых нет в этих инструкциях или на сайте.`;

// Ограничения на размер запроса (от злоупотреблений и расходов на AI)
const MAX_MESSAGES = 20;
const MAX_CHARS_PER_MESSAGE = 4000;
const MAX_TOTAL_CHARS = 20_000;

const TextPartSchema = z.object({
  type: z.literal("text"),
  text: z.string().max(MAX_CHARS_PER_MESSAGE),
});

const UIMessageSchema = z.object({
  id: z.string().max(128).optional(),
  role: z.enum(["user", "assistant", "system"]),
  parts: z
    .array(z.union([TextPartSchema, z.object({ type: z.string() }).passthrough()]))
    .min(1)
    .max(8),
});

const BodySchema = z.object({
  messages: z.array(UIMessageSchema).min(1).max(MAX_MESSAGES),
});

// Простой in-memory rate-limit по IP (на инстанс воркера)
const RL_WINDOW_MS = 60_000;
const RL_MAX = 15;
const rlMap = new Map<string, { count: number; reset: number }>();

function rateLimit(ip: string): { ok: boolean; retryAfter?: number } {
  const now = Date.now();
  const entry = rlMap.get(ip);
  if (!entry || entry.reset < now) {
    rlMap.set(ip, { count: 1, reset: now + RL_WINDOW_MS });
    return { ok: true };
  }
  if (entry.count >= RL_MAX) {
    return { ok: false, retryAfter: Math.ceil((entry.reset - now) / 1000) };
  }
  entry.count += 1;
  return { ok: true };
}

function getClientIp(request: Request): string {
  const h = request.headers;
  return (
    h.get("cf-connecting-ip") ||
    h.get("x-real-ip") ||
    (h.get("x-forwarded-for") || "").split(",")[0].trim() ||
    "unknown"
  );
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        // Rate-limit
        const ip = getClientIp(request);
        const rl = rateLimit(ip);
        if (!rl.ok) {
          return new Response("Too Many Requests", {
            status: 429,
            headers: { "Retry-After": String(rl.retryAfter ?? 60) },
          });
        }

        // Парсинг и валидация
        let raw: unknown;
        try {
          raw = await request.json();
        } catch {
          return new Response("Bad Request", { status: 400 });
        }
        const parsed = BodySchema.safeParse(raw);
        if (!parsed.success) {
          return new Response("Bad Request", { status: 400 });
        }

        const messages = parsed.data.messages as unknown as UIMessage[];
        const totalChars = messages.reduce((sum, m) => {
          const t = (m.parts ?? []).reduce(
            (s, p) => s + (p.type === "text" ? (p as { text: string }).text.length : 0),
            0,
          );
          return sum + t;
        }, 0);
        if (totalChars > MAX_TOTAL_CHARS) {
          return new Response("Payload Too Large", { status: 413 });
        }

        const key = process.env.OPENROUTER_API_KEY;
        if (!key) return new Response("Missing OPENROUTER_API_KEY", { status: 500 });

        const provider = createOpenRouterProvider(key);
        const model = provider(CHAT_MODEL);
        const result = streamText({
          model,
          system: SYSTEM_PROMPT,
          messages: await convertToModelMessages(messages),
          // Технический предохранитель поверх лимита в 250 символов из промпта —
          // не даёт модели уйти в длинный ответ, даже если инструкция не сработает.
          maxOutputTokens: 200,
        });
        return result.toUIMessageStreamResponse({ originalMessages: messages });
      },
    },
  },
});
