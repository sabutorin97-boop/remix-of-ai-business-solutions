import { createFileRoute } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { FinalCta } from "@/components/site/FinalCta";

const features = [
  "Воронка продаж с этапами под ваш бизнес",
  "База клиентов, сделки и задачи",
  "Интеграция с сайтом, ботом и оплатами",
  "AI-ассистент: подсказки и автозаполнение",
  "Аналитика и отчёты в реальном времени",
  "Доступ с любого устройства",
];

export const Route = createFileRoute("/avito")({
  head: () => ({
    meta: [
      { title: "CRM для компании — AI-Profigrup" },
      { name: "description", content: "CRM-система под ваш бизнес: воронка продаж, клиенты, задачи и аналитика. Интеграция с сайтом и ботом." },
      { property: "og:title", content: "CRM для компании от AI-Profigrup" },
      { property: "og:description", content: "Воронка, клиенты, задачи, аналитика и AI — всё в одной системе." },
      { property: "og:url", content: "https://ai-profigrup-studia.lovable.app/avito" },
    ],
    links: [{ rel: "canonical", href: "https://ai-profigrup-studia.lovable.app/avito" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Service",
          name: "CRM для компании",
          provider: { "@type": "Organization", name: "AI-Profigrup", url: "https://ai-profigrup-studia.lovable.app" },
          areaServed: "RU",
          description: "CRM-система с воронкой продаж, клиентами, задачами, аналитикой и AI-ассистентом.",
          url: "https://ai-profigrup-studia.lovable.app/avito",
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
      </section>
      <FinalCta />
    </>
  ),
});
