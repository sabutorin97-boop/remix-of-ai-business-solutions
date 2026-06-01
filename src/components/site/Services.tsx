import { Link } from "@tanstack/react-router";
import { ArrowRight, Globe, Bot, Database, Zap } from "lucide-react";

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
    icon: Database,
    title: "CRM для компании",
    description:
      "CRM-система под ваш бизнес: воронка продаж, клиенты, задачи и аналитика. Интеграция с сайтом, ботом и AI.",
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

      <a
        href="#calculator"
        className="group mt-6 block glass rounded-3xl p-7 md:p-9 border border-primary/30 hover:border-primary/60 transition-all hover:-translate-y-1 bg-[linear-gradient(135deg,hsl(262_85%_62%/0.08),hsl(245_80%_58%/0.08))]"
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-brand text-primary-foreground shadow-glow">
              <Zap className="h-6 w-6" />
            </div>
            <div>
              <div className="inline-block rounded-full bg-primary/15 text-primary px-2.5 py-0.5 text-[11px] font-medium mb-2">
                Итоговый продукт · −25%
              </div>
              <h3 className="text-2xl font-semibold">Автоворонка продаж</h3>
              <p className="mt-2 text-sm text-muted-foreground max-w-xl">
                Сайт + Telegram-бот + CRM + AI в одной системе. Трафик → заявка → бот → CRM → продажа. Считаем под ваш бизнес в калькуляторе.
              </p>
            </div>
          </div>
          <div className="inline-flex items-center gap-1 text-sm font-medium text-foreground self-start md:self-center">
            Рассчитать
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </div>
        </div>
      </a>
    </section>
  );
}
