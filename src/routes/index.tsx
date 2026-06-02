import { createFileRoute } from "@tanstack/react-router";
import { Hero } from "@/components/site/Hero";
import { Metrics } from "@/components/site/Metrics";
import { Services } from "@/components/site/Services";
import { Compare } from "@/components/site/Compare";
import { Calculator } from "@/components/site/Calculator";
import { Quiz } from "@/components/site/Quiz";
import { CasesSection } from "@/components/site/Cases";
import { Process } from "@/components/site/Process";
import { Faq } from "@/components/site/Faq";
import { LeadMagnet } from "@/components/site/LeadMagnet";
import { ContactForm } from "@/components/site/ContactForm";
import { FinalCta } from "@/components/site/FinalCta";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AI-Profigrup — AI-сайты и автоматизация бизнеса" },
      { name: "description", content: "AI-студия: сайты, Telegram-боты и AI-автоматизация за 3–7 дней. Экономия до 70%." },
      { property: "og:title", content: "AI-Profigrup — AI-сайты и автоматизация" },
      { property: "og:description", content: "Сайты, Telegram-боты и AI-системы для бизнеса за 3–7 дней." },
      { property: "og:url", content: "https://ai-profigrup-studia.lovable.app/" },
      { property: "og:image", content: "https://ai-profigrup-studia.lovable.app/__l5e/assets-v1/186177fd-296a-4506-af67-9c63e3a0665f/og-home.jpg" },
      { name: "twitter:image", content: "https://ai-profigrup-studia.lovable.app/__l5e/assets-v1/186177fd-296a-4506-af67-9c63e3a0665f/og-home.jpg" },
    ],
    links: [{ rel: "canonical", href: "https://ai-profigrup-studia.lovable.app/" }],
  }),
  component: Index,
});

function Index() {
  return (
    <>
      <Hero />
      <Metrics />
      <Services />
      <Process />
      <Compare />
      <Calculator />
      <Quiz />
      <CasesSection />
      <Faq />
      <LeadMagnet />
      <ContactForm />
      <FinalCta />
    </>
  );
}
