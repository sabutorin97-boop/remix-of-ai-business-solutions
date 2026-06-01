import { Link } from "@tanstack/react-router";
import { ArrowRight, Globe, Bot, ShoppingBag } from "lucide-react";

const services = [
  {
    icon: Globe,
    title: "AI-сайты",
    description:
      "Premium сайты, лендинги и квиз-воронки за 3–7 дней. С AI-ассистентами и интеграциями.",
    to: "/ai-websites" as const,
  },
  {
    icon: Bot,
    title: "Telegram-боты",
    description:
      "Боты для продаж, поддержки и автоматизации воронок. С AI и интеграцией CRM.",
    to: "/telegram-bots" as const,
  },
  {
    icon: ShoppingBag,
    title: "Авито под ключ",
    description:
      "Прокачанные аккаунты, автоворонки и автоответы. Заявки на потоке, без рутины.",
    to: "/avito" as const,
  },
];

export function Services() {
  return (
    <section id="services" className="container mx-auto px-4 md:px-6 py-20">
      <div className="text-center max-w-2xl mx-auto">
        <div className="inline-block rounded-full glass px-3 py-1 text-xs text-muted-foreground">Услуги</div>
        <h2 className="mt-4 text-4xl md:text-5xl font-bold tracking-tight">
          Делаем бизнес-системы, <br />
          <span className="text-gradient">а не просто сайты</span>
        </h2>
        <p className="mt-4 text-muted-foreground">
          Каждый проект — это инструмент роста. AI ускоряет разработку, мы фокусируемся
          на конверсии и автоматизации.
        </p>
      </div>

      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {services.map((s) => (
          <Link
            key={s.title}
            to={s.to}
            className="group glass rounded-3xl p-7 transition-all hover:border-primary/40 hover:-translate-y-1"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-brand text-primary-foreground">
              <s.icon className="h-6 w-6" />
            </div>
            <h3 className="mt-5 text-xl font-semibold">{s.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{s.description}</p>
            <div className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-foreground">
              Подробнее
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
