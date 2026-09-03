import { createFileRoute, Link } from "@tanstack/react-router";
import { Gift, Radar, Send, Sparkles, Zap } from "lucide-react";
import { ymGoal } from "@/components/site/YandexMetrika";

/**
 * Подписная страница под рекламу (Яндекс.Директ, VK Ads).
 * Одна цель — подписка на Telegram-канал, поэтому шапка, подвал и виджет
 * «Спросить Макса» на этом маршруте скрыты (см. __root.tsx).
 */

// Ссылка на канал. Для раздельного учёта источников сюда можно подставить
// именованную пригласительную ссылку вида https://t.me/+xxxxxxxxxx —
// Telegram показывает по каждой такой ссылке, сколько человек по ней вступило.
const CHANNEL_URL = "https://t.me/ai_prodazhi_pro";
const CHANNEL_NAME = "@ai_prodazhi_pro";

// Бонус за подписку. Меняется целиком здесь: подарок может стать другим, форма
// подачи останется. Держите `short` конкретным — «15 генераций» работает
// заметно лучше, чем абстрактное «приятный бонус».
//
// Выдаёт бонус бот «Азимут» (@AIProfigrupConsultant_bot), его код живёт вне
// этого репозитория. Пока выдача реально не работает, платный трафик на
// страницу пускать нельзя: невыполненное обещание — жалобы и риск на
// модерации Директа. Подробности в CLAUDE.md.
const BONUS = {
  enabled: true,
  // Строка над кнопкой, самое заметное место после заголовка.
  short: "15 генераций изображений в PixSpark",
  title: "Бонус за подписку",
  text: "Наш AI-генератор изображений PixSpark на время открывается новым подписчикам. Пятнадцать генераций, без карты и без оплаты.",
  // Намеренно не описываем шаги: механика выдачи ещё может измениться, а
  // ошибиться в инструкции на рекламной странице дороже, чем недосказать.
  note: "Как забрать — расскажем в канале сразу после подписки.",
};

// Счётчик подписчиков. Пока в канале мало людей, цифра работает против нас,
// поэтому null. Включать, когда наберётся хотя бы несколько сотен.
const SUBSCRIBER_COUNT: number | null = null;

const VALUE_POINTS = [
  {
    icon: Zap,
    title: "Реальные кейсы внедрения",
    text: "Что и кому внедряем, сколько это заняло и какие получились цифры. Без обещаний вроде «х10 к выручке за неделю».",
  },
  {
    icon: Sparkles,
    title: "Инструменты и промпты",
    text: "Готовые связки и промпты, которые можно взять и применить в работе в тот же день.",
  },
  {
    icon: Radar,
    title: "Новости рынка без шума",
    text: "Только то, что реально меняет работу. Пара постов в неделю вместо ленты каждый час.",
  },
];

const TITLE = "AI Продажи — Telegram-канал про нейросети в бизнесе";
const DESCRIPTION =
  "Кейсы внедрения AI, готовые промпты и инструменты, новости рынка без шума. Бесплатный Telegram-канал для тех, кто применяет нейросети в работе.";
const OG_IMAGE = "https://aiprofigrup.ru/cases/own-site.jpg";

export const Route = createFileRoute("/tg")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://aiprofigrup.ru/tg" },
      { property: "og:image", content: OG_IMAGE },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
      { name: "twitter:image", content: OG_IMAGE },
    ],
    links: [{ rel: "canonical", href: "https://aiprofigrup.ru/tg" }],
  }),
  component: TgLanding,
});

function SubscribeButton({ place, className = "" }: { place: string; className?: string }) {
  return (
    <a
      href={CHANNEL_URL}
      target="_blank"
      rel="noreferrer"
      onClick={() => ymGoal("tg_subscribe_click", { place })}
      className={`inline-flex h-14 w-full items-center justify-center gap-2.5 whitespace-nowrap rounded-full bg-gradient-brand px-6 text-base font-semibold text-primary-foreground shadow-glow transition-all duration-300 hover:scale-[1.02] hover:opacity-95 active:scale-[0.98] sm:w-auto sm:px-8 sm:text-lg ${className}`}
    >
      <Send className="h-5 w-5" />
      Подписаться в Telegram
    </a>
  );
}

function TgLanding() {
  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-60" />

      <div className="relative container mx-auto flex min-h-[calc(100vh-1px)] max-w-3xl flex-col px-4 py-12 md:px-6 md:py-20">
        <div className="inline-flex w-fit items-center gap-2 rounded-full glass px-4 py-1.5 text-xs text-foreground">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success/60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
          </span>
          Telegram-канал {CHANNEL_NAME}
        </div>

        <h1 className="mt-6 max-w-2xl text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl md:text-6xl">
          AI-кейсы, инструменты и новости — <span className="text-gradient">бесплатно</span>
        </h1>

        <p className="mt-6 max-w-2xl text-base text-muted-foreground md:text-lg">
          Канал о том, как нейросети реально работают в бизнесе: что внедряем клиентам, сколько это
          стоит и что из этого выходит. Без курсов, без инфошума и без новостей ради новостей.
        </p>

        {BONUS.enabled && (
          <div className="mt-6 inline-flex w-fit items-center gap-3 rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3">
            <Gift className="h-5 w-5 shrink-0 text-primary" />
            <span className="text-sm">
              <span className="text-muted-foreground">Бонус за подписку: </span>
              <span className="font-semibold">{BONUS.short}</span>
            </span>
          </div>
        )}

        <div className="mt-8">
          <SubscribeButton place="hero" />
          <p className="mt-3 text-xs text-muted-foreground">
            Бесплатно. Отписаться можно в один клик.
          </p>
        </div>

        <div className="mt-14 grid gap-4 sm:grid-cols-3">
          {VALUE_POINTS.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-2xl glass p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-brand text-primary-foreground">
                <Icon className="h-5 w-5" />
              </div>
              <div className="mt-4 text-sm font-semibold">{title}</div>
              <p className="mt-2 text-sm text-muted-foreground">{text}</p>
            </div>
          ))}
        </div>

        {BONUS.enabled && (
          <div className="mt-4 flex flex-col gap-4 rounded-2xl border border-primary/25 bg-primary/[0.07] p-5 sm:flex-row sm:items-center sm:gap-5 sm:p-6">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-brand text-primary-foreground">
              <Gift className="h-6 w-6" />
            </div>
            <div>
              <div className="text-base font-semibold">{BONUS.title}</div>
              <p className="mt-1.5 text-sm text-muted-foreground">{BONUS.text}</p>
              <p className="mt-2 text-xs text-muted-foreground">{BONUS.note}</p>
            </div>
          </div>
        )}

        <div className="mt-14 rounded-3xl glass p-6 text-center md:p-10">
          <div className="text-xl font-semibold md:text-2xl">Загляните в канал и решите сами</div>
          <p className="mx-auto mt-3 max-w-lg text-sm text-muted-foreground">
            По последним постам сразу видно, о чём он и подходит ли вам. Подписка ни к чему не
            обязывает.
          </p>
          <div className="mt-6 flex flex-col items-center">
            <SubscribeButton place="bottom" />
            {SUBSCRIBER_COUNT !== null && (
              <p className="mt-3 text-xs text-muted-foreground">
                Уже {SUBSCRIBER_COUNT.toLocaleString("ru-RU")} подписчиков
              </p>
            )}
          </div>
        </div>

        <div className="mt-auto pt-14">
          <div className="flex flex-col items-center gap-2 border-t border-border/40 pt-6 text-xs text-muted-foreground sm:flex-row sm:justify-between">
            <span>© {new Date().getFullYear()} AI-Profigrup</span>
            <span className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
              <Link to="/" className="hover:text-foreground">
                О студии
              </Link>
              <Link to="/contact" className="hover:text-foreground">
                Контакты
              </Link>
              <Link to="/privacy" className="hover:text-foreground">
                Политика обработки персональных данных
              </Link>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
