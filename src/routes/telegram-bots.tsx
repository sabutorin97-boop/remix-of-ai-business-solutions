import { createFileRoute } from "@tanstack/react-router";
import { Check } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { FinalCta } from "@/components/site/FinalCta";

const features = [
  "Боты продаж и приёма заявок",
  "AI-консультанты на базе GPT",
  "Автоворонки с прогревом",
  "Интеграции с CRM и оплатами",
  "Аналитика и сегментация",
  "Поддержка 24/7 после запуска",
];

const faqs = [
  {
    q: "Кому принадлежит токен и сам бот после сдачи проекта?",
    a: "Бот создаётся через ваш аккаунт в Telegram (@BotFather), поэтому токен и права владельца изначально ваши. Мы не держим ботов клиентов на своём аккаунте и не можем забрать их себе.",
  },
  {
    q: "Что будет, если Telegram изменит политику для ботов?",
    a: "Мы следим за изменениями Bot API и обновляем логику бота при необходимости. Это входит в поддержку после запуска — вы не остаётесь один на один с техническими изменениями платформы.",
  },
  {
    q: "Может ли бот передать сложный диалог живому менеджеру?",
    a: "Да, это стандартный сценарий: бот ведёт разговор сам, а на сложном или горячем запросе эскалирует диалог живому человеку и уведомляет о новом обращении. Так, например, устроен наш собственный консультационный бот на сайте.",
  },
  {
    q: "Бот может работать с оплатами и CRM одновременно?",
    a: "Да, приём оплат (Telegram Payments, ЮKassa и другие) и передача заявки/сделки в CRM настраиваются в одном боте — клиент оплачивает и попадает в воронку без переключения между системами.",
  },
  {
    q: "Нужен ли отдельный сервер для бота?",
    a: "Для большинства сценариев отдельный сервер не нужен — бот размещается на нашей инфраструктуре или недорогом хостинге. Отдельный сервер имеет смысл только для нагруженных ботов с большим потоком сообщений или автономных AI-агентов, работающих 24/7 на стороне заказчика.",
  },
  {
    q: "Бот умеет консультировать по прайсу и услугам самостоятельно?",
    a: "Да, AI-консультант обучается на базе знаний о вашем бизнесе: ценах, услугах, частых вопросах — и отвечает по актуальным данным, а не общими фразами.",
  },
];

export const Route = createFileRoute("/telegram-bots")({
  head: () => ({
    meta: [
      { title: "Telegram-боты — AI-Profigrup" },
      { name: "description", content: "Боты для продаж, поддержки и автоматизации воронок с AI и CRM." },
      { property: "og:title", content: "Telegram-боты от AI-Profigrup" },
      { property: "og:description", content: "AI-боты, которые продают и поддерживают 24/7." },
      { property: "og:url", content: "https://aiprofigrup.ru/telegram-bots" },
    ],
    links: [{ rel: "canonical", href: "https://aiprofigrup.ru/telegram-bots" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Service",
          name: "Telegram-боты с AI",
          provider: { "@type": "Organization", name: "AI-Profigrup", url: "https://aiprofigrup.ru" },
          areaServed: "RU",
          description: "Боты для продаж, поддержки и автоматизации воронок с AI и CRM.",
          url: "https://aiprofigrup.ru/telegram-bots",
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
      <section className="container mx-auto px-4 md:px-6 py-20">
        <div className="max-w-3xl">
          <div className="inline-block rounded-full glass px-3 py-1 text-xs text-muted-foreground">Услуга</div>
          <h1 className="mt-4 text-5xl md:text-6xl font-bold tracking-tight">
            <span className="text-gradient">Telegram-боты</span> с AI
          </h1>
          <p className="mt-4 text-muted-foreground text-lg">
            Боты, которые продают, отвечают клиентам и автоматизируют рутину менеджеров.
          </p>
        </div>
        <div className="mt-12 grid gap-3 md:grid-cols-2">
          {features.map((f) => (
            <div key={f} className="glass rounded-2xl px-5 py-4 flex items-start gap-3">
              <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-brand">
                <Check className="h-3.5 w-3.5 text-primary-foreground" />
              </div>
              <span className="text-sm">{f}</span>
            </div>
          ))}
        </div>

        <div className="mt-14">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
            Вопросы про <span className="text-gradient">Telegram-ботов</span>
          </h2>
          <div className="mt-6 glass rounded-3xl p-2 md:p-4">
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
        </div>
      </section>
      <FinalCta />
    </>
  ),
});
