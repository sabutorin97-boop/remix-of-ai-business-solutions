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
  "Лендинги, корпоративные сайты, квиз-воронки",
  "AI-ассистенты и чат-боты на странице",
  "Интеграции с CRM, оплатами, аналитикой",
  "Премиум-дизайн без шаблонов",
  "Запуск за 3–7 дней",
  "Поддержка и доработки в день обращения",
];

const faqs = [
  {
    q: "Чей домен и хостинг после сдачи сайта?",
    a: "Домен и хостинг оформляются на вас или переносятся на ваш аккаунт при сдаче проекта. Мы не держим сайт на своей инфраструктуре и не привязываем его к своей подписке — полная независимость от нас.",
  },
  {
    q: "Смогу ли я сам редактировать сайт без разработчика?",
    a: "Тексты, изображения и цены на лендингах и квиз-воронках можно менять самостоятельно через понятную админку или CMS. Для более глубоких правок (новые блоки, интеграции) проще обратиться к нам — доработки делаем в день обращения.",
  },
  {
    q: "Сайт точно будет нормально работать на телефоне?",
    a: "Да, вёрстка адаптивная по умолчанию: сайт проверяется на мобильных, планшетах и десктопе ещё до сдачи. Больше половины трафика у наших клиентов приходит именно с телефонов.",
  },
  {
    q: "Что с SEO и Яндекс.Метрикой?",
    a: "Подключаем Яндекс.Метрику и базовую SEO-разметку (заголовки, мета-теги, Schema.org, скорость загрузки) на этапе сдачи. Само продвижение в поиске — не наша зона, но техническая база для него уже готова.",
  },
  {
    q: "Чем лендинг отличается от корпоративного сайта?",
    a: "Лендинг — одна страница под одно предложение или продукт, запускается за 3–5 дней и обычно дешевле. Корпоративный сайт — несколько разделов (о компании, услуги, кейсы, контакты), делается за 5–7 дней и подходит, когда бизнесу нужно показать себя шире, чем один оффер.",
  },
  {
    q: "Можно заказать только квиз-воронку без остального сайта?",
    a: "Да, квиз можно встроить в уже существующий сайт или сделать отдельной посадочной страницей — стоимость и сроки обсуждаем индивидуально в зависимости от сложности сценария.",
  },
];

export const Route = createFileRoute("/ai-websites")({
  head: () => ({
    meta: [
      { title: "AI-сайты — AI-Profigrup" },
      { name: "description", content: "Premium сайты, лендинги и квиз-воронки с AI-ассистентами за 3–7 дней." },
      { property: "og:title", content: "AI-сайты от AI-Profigrup" },
      { property: "og:description", content: "Сайты с AI, которые приводят клиентов." },
      { property: "og:url", content: "https://aiprofigrup.ru/ai-websites" },
      { property: "og:image", content: "https://aiprofigrup.ru/cases/own-site.jpg" },
      { name: "twitter:image", content: "https://aiprofigrup.ru/cases/own-site.jpg" },
    ],
    links: [{ rel: "canonical", href: "https://aiprofigrup.ru/ai-websites" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Service",
          name: "AI-сайты под ключ",
          provider: { "@type": "Organization", name: "AI-Profigrup", url: "https://aiprofigrup.ru" },
          areaServed: "RU",
          description: "Premium сайты, лендинги и квиз-воронки с AI-ассистентами за 3–7 дней.",
          url: "https://aiprofigrup.ru/ai-websites",
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
            <span className="text-gradient">AI-сайты</span> за 3–7 дней
          </h1>
          <p className="mt-4 text-muted-foreground text-lg">
            Premium сайты с AI-ассистентами, квиз-воронками и интеграциями. Не шаблон, а инструмент роста.
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
            Вопросы про <span className="text-gradient">AI-сайты</span>
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
