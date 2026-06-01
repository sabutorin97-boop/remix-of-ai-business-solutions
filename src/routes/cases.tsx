import { createFileRoute } from "@tanstack/react-router";
import { CasesSection } from "@/components/site/Cases";
import { FinalCta } from "@/components/site/FinalCta";

export const Route = createFileRoute("/cases")({
  head: () => ({
    meta: [
      { title: "Кейсы — AI-Profigrup" },
      { name: "description", content: "Реальные результаты клиентов: +312% заявок, −58% стоимость лида, 1200+ диалогов в месяц." },
      { property: "og:title", content: "Кейсы AI-Profigrup" },
      { property: "og:description", content: "Цифры, а не красивые слова." },
      { property: "og:url", content: "https://ai-profigrup-studia.lovable.app/cases" },
    ],
    links: [{ rel: "canonical", href: "https://ai-profigrup-studia.lovable.app/cases" }],
  }),
  component: () => (
    <>
      <div className="container mx-auto px-4 md:px-6 pt-16 text-center">
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
          Наши <span className="text-gradient">кейсы</span>
        </h1>
      </div>
      <CasesSection />
      <FinalCta />
    </>
  ),
});
