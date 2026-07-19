import { createFileRoute } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { FinalCta } from "@/components/site/FinalCta";

const features = [
  "Лендинги, корпоративные сайты, квиз-воронки",
  "AI-ассистенты и чат-боты на странице",
  "Интеграции с CRM, оплатами, аналитикой",
  "Премиум-дизайн без шаблонов",
  "Запуск за 3–7 дней",
  "Поддержка и доработки в день обращения",
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
      </section>
      <FinalCta />
    </>
  ),
});
