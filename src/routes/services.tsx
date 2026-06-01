import { createFileRoute } from "@tanstack/react-router";
import { Services } from "@/components/site/Services";
import { Compare } from "@/components/site/Compare";
import { FinalCta } from "@/components/site/FinalCta";

export const Route = createFileRoute("/services")({
  head: () => ({
    meta: [
      { title: "Услуги — AI-Profigrup" },
      { name: "description", content: "AI-сайты, Telegram-боты, Авито под ключ и полная автоматизация бизнеса." },
      { property: "og:title", content: "Услуги AI-Profigrup" },
      { property: "og:description", content: "Что мы делаем: AI-сайты, боты, Авито." },
      { property: "og:url", content: "https://ai-profigrup-studia.lovable.app/services" },
    ],
    links: [{ rel: "canonical", href: "https://ai-profigrup-studia.lovable.app/services" }],
  }),
  component: () => (
    <>
      <div className="container mx-auto px-4 md:px-6 pt-16 text-center">
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
          Наши <span className="text-gradient">услуги</span>
        </h1>
        <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
          От лендинга до полной AI-автоматизации продаж и поддержки.
        </p>
      </div>
      <Services />
      <Compare />
      <FinalCta />
    </>
  ),
});
