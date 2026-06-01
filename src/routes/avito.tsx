import { createFileRoute } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { FinalCta } from "@/components/site/FinalCta";

const features = [
  "Прокачка и оформление аккаунта",
  "Автоответы и автоворонки",
  "AI-консультант в чатах Авито",
  "Регулярные публикации и аналитика",
  "Стабильный поток заявок",
  "Без рутины менеджеров",
];

export const Route = createFileRoute("/avito")({
  head: () => ({
    meta: [
      { title: "Авито под ключ — AI-Profigrup" },
      { name: "description", content: "Прокачанные аккаунты, автоворонки и автоответы на Авито. Заявки на потоке." },
      { property: "og:title", content: "Авито под ключ от AI-Profigrup" },
      { property: "og:description", content: "+4 заявки в день стабильно — без рутины." },
      { property: "og:url", content: "https://ai-profigrup-studia.lovable.app/avito" },
    ],
    links: [{ rel: "canonical", href: "https://ai-profigrup-studia.lovable.app/avito" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Service",
          name: "Авито под ключ",
          provider: { "@type": "Organization", name: "AI-Profigrup", url: "https://ai-profigrup-studia.lovable.app" },
          areaServed: "RU",
          description: "Прокачка аккаунтов, автоворонки и AI-ответы на Авито.",
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
            <span className="text-gradient">Авито</span> под ключ
          </h1>
          <p className="mt-4 text-muted-foreground text-lg">
            Заявки на потоке без рутины менеджеров. Прокачанный аккаунт + автоворонки + AI-ответы.
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
