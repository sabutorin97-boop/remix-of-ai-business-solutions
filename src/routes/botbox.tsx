import { createFileRoute } from "@tanstack/react-router";
import { Bot, Check, ChartCandlestick, Cpu, LifeBuoy, MessageSquare, MessagesSquare, Sparkles, UserSquare } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { FinalCta } from "@/components/site/FinalCta";

const problems = [
  "Клиенты заходят на сайт ночью — вы спите, заявка уходит к конкуренту",
  "Менеджер не успевает отвечать — клиент уходит за 30 секунд без ответа",
  "На вопросы про цены и сроки приходится отвечать вручную сотни раз",
];

const benefits = [
  "Бот отвечает на любые вопросы о вашем бизнесе 24/7",
  "Собирает контакты и передаёт заявку в Telegram",
  "Ставится на сайт за 1 день — без программистов",
  "Обучается под ваш товар или услугу за 30 минут",
  "Работает на Tilda, WordPress и любых сайтах",
  "Не нужен отдельный сервер — готовое облачное решение",
];

const prices = [
  {
    name: "Старт",
    price: "4 900 ₽",
    period: "разово",
    desc: "AI-консультант на сайт + месяц поддержки",
    items: ["Подключение за 1 день", "Обучение под ваш бизнес", "Виджет на сайт", "Чат-бот на сайте", "1 месяц поддержки"],
    cta: "Заказать Старт",
  },
  {
    name: "Бизнес",
    price: "9 900 ₽",
    period: "разово",
    desc: "AI-консультант + полная настройка сценариев",
    items: ["Всё из Старт", "Глубокая настройка ответов", "Сбор заявок в Telegram", "Интеграция с CRM", "3 месяца поддержки"],
    popular: true,
    cta: "Заказать Бизнес",
  },
  {
    name: "Комплекс",
    price: "19 900 ₽",
    period: "разово",
    desc: "AI-консультант + Telegram-бот + поддержка полгода",
    items: ["Всё из Бизнес", "Telegram-бот продаж", "Персональный лендинг", "Автоворонка заявок", "6 месяцев поддержки"],
    cta: "Заказать комплекс",
  },
];

const faqs = [
  {
    q: "Как быстро подключается?",
    a: "Обычно за 1 день. Вы присылаете ссылку на сайт и информацию о бизнесе — мы настраиваем и добавляем виджет. Если сайта ещё нет — сделаем за 1–2 дня бесплатно в тарифе «Комплекс».",
  },
  {
    q: "Можно попробовать перед покупкой?",
    a: "Да, мы подключаем тестовый период на 3 дня. Вы смотрите, как работает, пробуете на реальных клиентах. Если не подходит — отключаем без доплат.",
  },
  {
    q: "Подходит для любого сайта?",
    a: "Да. Tilda, WordPress, Readymag, конструкторы, самописные сайты — виджет работает везде. Нужна только одна строчка кода перед закрывающим тегом &lt;/body&gt;.",
  },
  {
    q: "AI не будет отвечать ерунду?",
    a: "Мы настраиваем бота на ваших данных: цены, товары, услуги, частые вопросы. Он отвечает строго по загруженной базе знаний, не фантазирует. Плюс можно задать границы — скажем, отвечать только по ценам и срокам.",
  },
  {
    q: "Кому подходит BotBox?",
    a: "Владельцам малого бизнеса, ИП, самозанятым — у кого есть сайт и кто теряет клиентов, пока не отвечает. Не подходит, если вам нужен сложный скрипт продаж с интеграцией в 1С — это уже услуга AI-студии.",
  },
  {
    q: "Что нужно с моей стороны для запуска?",
    a: "Ссылка на сайт, описание бизнеса (что продаёте, кому, по каким ценам) и список частых вопросов клиентов. Всё. Дальше делаем мы.",
  },
];

const howSteps = [
  { icon: MessageSquare, title: "Рассказываете о бизнесе", desc: "Ссылка на сайт, цены, частые вопросы — 10 минут на заполнение" },
  { icon: Cpu, title: "Настраиваем AI", desc: "Обучаем бота на ваших данных, подключаем виджет к сайту" },
  { icon: Sparkles, title: "Запускаем за 1 день", desc: "Бот отвечает клиентам, собирает заявки — вы получаете больше продаж" },
];

export const Route = createFileRoute("/botbox")({
  head: () => ({
    meta: [
      { title: "BotBox — AI-консультант на сайт за 1 день" },
      { name: "description", content: "AI-консультант на сайт за 1 день. Отвечает на вопросы клиентов 24/7, собирает заявки, не требует программистов. Подходит для Tilda, WordPress и любых сайтов." },
      { property: "og:title", content: "BotBox — AI-консультант на сайт" },
      { property: "og:description", content: "AI-консультант на сайт за 1 день. 24/7 отвечает на вопросы, собирает заявки, не требует программистов." },
      { property: "og:url", content: "https://aiprofigrup.ru/botbox" },
      { name: "twitter:image", content: "https://aiprofigrup.ru/cases/own-site.jpg" },
    ],
    links: [{ rel: "canonical", href: "https://aiprofigrup.ru/botbox" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Product",
          name: "BotBox — AI-консультант на сайт",
          description: "AI-чат на сайт, который отвечает на вопросы клиентов 24/7 и собирает заявки.",
          offers: {
            "@type": "AggregateOffer",
            lowPrice: "4900",
            highPrice: "19900",
            priceCurrency: "RUB",
            availability: "https://schema.org/InStock",
          },
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqs.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }),
      },
    ],
  }),
  component: () => (
    <>
      {/** HERO **/}
      <section className="container mx-auto px-4 md:px-6 py-16 md:py-24">
        <div className="max-w-4xl">
          <div className="inline-block rounded-full glass px-3 py-1 text-xs text-muted-foreground">
            <Bot className="inline h-3 w-3 mr-1" /> BotBox — продукт AI-Profigrup
          </div>
          <h1 className="mt-6 text-5xl md:text-7xl font-bold tracking-tight leading-[1.05]">
            AI-консультант на ваш сайт{" "}
            <span className="text-gradient">за 1 день</span>
          </h1>
          <p className="mt-4 text-lg md:text-xl text-muted-foreground max-w-2xl">
            Бот отвечает на вопросы клиентов 24/7, собирает заявки и не спит.
            Без программистов, без сервера, без ежемесячной платы.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-4">
            <a href="https://t.me/AiProfiGrup_bot" target="_blank" rel="noreferrer">
              <Button size="lg" className="bg-gradient-brand text-primary-foreground rounded-full shadow-glow w-full sm:w-auto">
                <Sparkles className="mr-2 h-4 w-4" /> Заказать BotBox
              </Button>
            </a>
            <a href="#prices">
              <Button size="lg" variant="outline" className="rounded-full border-border bg-secondary/40 w-full sm:w-auto">
                <MessagesSquare className="mr-2 h-4 w-4" /> Смотреть цены
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/** Проблема **/}
      <section className="container mx-auto px-4 md:px-6 py-16">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
            Вы теряете клиентов <span className="text-gradient">прямо сейчас</span>
          </h2>
          <div className="mt-10 space-y-4 text-left">
            {problems.map((p) => (
              <div key={p} className="glass rounded-2xl px-6 py-4 flex items-start gap-3">
                <div className="h-6 w-6 shrink-0 flex items-center justify-center rounded-full bg-gradient-brand">
                  <span className="text-primary-foreground font-bold">!</span>
                </div>
                <span className="text-sm md:text-base">{p}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/** Решение **/}
      <section className="container mx-auto px-4 md:px-6 py-16">
        <div className="text-center max-w-2xl mx-auto">
          <div className="inline-block rounded-full glass px-3 py-1 text-xs text-muted-foreground">Решение</div>
          <h2 className="mt-4 text-3xl md:text-4xl font-bold tracking-tight">
            Что делает <span className="text-gradient">BotBox</span>
          </h2>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {benefits.map((b) => (
            <div key={b} className="glass rounded-2xl px-5 py-4 flex items-start gap-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-brand">
                <Check className="h-3.5 w-3.5 text-primary-foreground" />
              </div>
              <span className="text-sm md:text-base">{b}</span>
            </div>
          ))}
        </div>
      </section>

      {/** Как работает **/}
      <section className="container mx-auto px-4 md:px-6 py-16">
        <div className="text-center max-w-2xl mx-auto">
          <div className="inline-block rounded-full glass px-3 py-1 text-xs text-muted-foreground">Как это работает</div>
          <h2 className="mt-4 text-3xl md:text-4xl font-bold tracking-tight">
            Три шага до <span className="text-gradient">запуска</span>
          </h2>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {howSteps.map((s, i) => (
            <div key={s.title} className="glass rounded-3xl p-6 relative">
              <div className="absolute -top-3 left-6 rounded-full bg-gradient-brand text-primary-foreground text-xs font-semibold px-3 py-1 shadow-glow">
                {String(i + 1).padStart(2, "0")}
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary mt-2">
                <s.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-base font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/** Цены **/}
      <section id="prices" className="container mx-auto px-4 md:px-6 py-16 scroll-mt-20">
        <div className="text-center max-w-2xl mx-auto">
          <div className="inline-block rounded-full glass px-3 py-1 text-xs text-muted-foreground">Цены</div>
          <h2 className="mt-4 text-3xl md:text-4xl font-bold tracking-tight">
            Выберите <span className="text-gradient">тариф</span>
          </h2>
          <p className="mt-4 text-muted-foreground">
            Без скрытых платежей. Всё включено в цену.
          </p>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {prices.map((p) => (
            <div key={p.name} className={`glass rounded-3xl p-6 relative ${p.popular ? 'border border-gradient-brand/30' : ''}`}>
              {p.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-brand text-primary-foreground text-xs font-semibold px-3 py-1 shadow-glow">
                  Популярный
                </div>
              )}
              <h3 className="text-xl font-bold mt-2">{p.name}</h3>
              <div className="mt-2">
                <span className="text-3xl font-bold text-gradient">{p.price}</span>
                <span className="text-sm text-muted-foreground"> {p.period}</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{p.desc}</p>
              <ul className="mt-4 space-y-2">
                {p.items.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <Check className="h-3 w-3 text-gradient shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <a href="https://t.me/AiProfiGrup_bot" target="_blank" rel="noreferrer" className="mt-6 block">
                <Button className="w-full bg-gradient-brand text-primary-foreground rounded-full shadow-glow">
                  {p.cta}
                </Button>
              </a>
            </div>
          ))}
        </div>
      </section>

      {/** FAQ **/}
      <section className="container mx-auto px-4 md:px-6 py-16">
        <div className="text-center max-w-2xl mx-auto">
          <div className="inline-block rounded-full glass px-3 py-1 text-xs text-muted-foreground">FAQ</div>
          <h2 className="mt-4 text-3xl md:text-4xl font-bold tracking-tight">
            Частые вопросы про <span className="text-gradient">BotBox</span>
          </h2>
        </div>
        <div className="mt-10 max-w-3xl mx-auto glass rounded-3xl p-2 md:p-4">
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((f, i) => (
              <AccordionItem key={i} value={`item-${i}`} className="border-border/60">
                <AccordionTrigger className="text-left text-base md:text-lg font-medium px-4">
                  {f.q}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground px-4">
                  {f.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      <FinalCta />
    </>
  ),
});
