import { createFileRoute } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { FinalCta } from "@/components/site/FinalCta";

const features = [
  "Боты продаж и приёма заявок",
  "AI-консультанты на базе GPT",
  "Автоворонки с прогревом",
  "Интеграции с CRM и оплатами",
  "Аналитика и сегментация",
  "Поддержка 24/7 после запуска",
];

export const Route = createFileRoute("/telegram-bots")({
  head: () => ({
    meta: [
      { title: "Telegram-боты — AI-Profigrup" },
      { name: "description", content: "Боты для продаж, поддержки и автоматизации воронок с AI и CRM." },
      { property: "og:title", content: "Telegram-боты от AI-Profigrup" },
      { property: "og:description", content: "AI-боты, которые продают и поддерживают 24/7." },
      { property: "og:url", content: "https://ai-profigrup-studia.lovable.app/telegram-bots" },
    ],
    links: [{ rel: "canonical", href: "https://ai-profigrup-studia.lovable.app/telegram-bots" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Service",
          name: "Telegram-боты с AI",
          provider: { "@type": "Organization", name: "AI-Profigrup", url: "https://ai-profigrup-studia.lovable.app" },
          areaServed: "RU",
          description: "Боты для продаж, поддержки и автоматизации воронок с AI и CRM.",
          url: "https://ai-profigrup-studia.lovable.app/telegram-bots",
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
      </section>
      <FinalCta />
    </>
  ),
});
