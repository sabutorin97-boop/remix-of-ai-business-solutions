import { createFileRoute } from "@tanstack/react-router";
import { ContactForm } from "@/components/site/ContactForm";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Контакты — AI-Profigrup" },
      { name: "description", content: "Свяжитесь с AI-Profigrup в Telegram. Отвечу лично в течение часа." },
      { property: "og:title", content: "Контакты AI-Profigrup" },
      { property: "og:description", content: "Telegram — отвечу лично в течение часа." },
      { property: "og:url", content: "https://aiprofigrup.ru/contact" },
    ],
    links: [{ rel: "canonical", href: "https://aiprofigrup.ru/contact" }],
  }),
  component: () => <ContactForm />,
});
