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
  "Воронка продаж с этапами под ваш бизнес",
  "База клиентов, сделки и задачи",
  "Интеграция с сайтом, ботом и оплатами",
  "AI-ассистент: подсказки и автозаполнение",
  "Аналитика и отчёты в реальном времени",
  "Доступ с любого устройства",
];

const faqs = [
  {
    q: "Можно ли перенести текущих клиентов и сделки из другой CRM?",
    a: "Да, при переходе с другой системы переносим базу клиентов, историю сделок и контакты — обсуждаем формат исходных данных на старте, чтобы ничего не потерялось при миграции.",
  },
  {
    q: "Сколько пользователей и менеджеров поддерживает система?",
    a: "Количество менеджеров с доступом рассчитывается под ваш отдел продаж — от одного человека до полноценной команды с разными ролями и правами. Ограничение зависит от выбранной конфигурации, а не жёстко зашито в продукт.",
  },
  {
    q: "CRM работает с телефона?",
    a: "Да, доступ к воронке, сделкам и задачам открыт с любого устройства через браузер — не нужно ставить отдельное приложение, чтобы посмотреть статус сделки в дороге.",
  },
  {
    q: "Что с резервным копированием данных?",
    a: "База данных регулярно резервируется, чтобы сбой на сервере не означал потерю сделок и истории клиентов. Детали графика бэкапов фиксируем в технической документации проекта.",
  },
  {
    q: "Можно добавить свои этапы воронки и поля под специфику бизнеса?",
    a: "Да, структура воронки, статусы сделок и дополнительные поля карточки клиента настраиваются под ваши бизнес-процессы, а не подгоняются под готовый шаблон.",
  },
];

export const Route = createFileRoute("/crm")({
  head: () => ({
    meta: [
      { title: "CRM для компании — AI-Profigrup" },
      { name: "description", content: "CRM-система под ваш бизнес: воронка продаж, клиенты, задачи и аналитика. Интеграция с сайтом и ботом." },
      { property: "og:title", content: "CRM для компании от AI-Profigrup" },
      { property: "og:description", content: "Воронка, клиенты, задачи, аналитика и AI — всё в одной системе." },
      { property: "og:url", content: "https://aiprofigrup.ru/crm" },
    ],
    links: [{ rel: "canonical", href: "https://aiprofigrup.ru/crm" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Service",
          name: "CRM для компании",
          provider: { "@type": "Organization", name: "AI-Profigrup", url: "https://aiprofigrup.ru" },
          areaServed: "RU",
          description: "CRM-система с воронкой продаж, клиентами, задачами, аналитикой и AI-ассистентом.",
          url: "https://aiprofigrup.ru/crm",
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
            <span className="text-gradient">CRM</span> для компании
          </h1>
          <p className="mt-4 text-muted-foreground text-lg">
            Воронка продаж, клиенты, задачи, аналитика и AI-ассистент. Интеграция с сайтом и ботом — единая система продаж.
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
            Вопросы про <span className="text-gradient">CRM</span>
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
