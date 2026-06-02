import { MessageSquare, ClipboardList, Sparkles, Rocket, LifeBuoy } from "lucide-react";

const steps = [
  {
    icon: MessageSquare,
    title: "Бриф в Telegram",
    desc: "Знакомимся, обсуждаем задачу и цели. 20–30 минут — бесплатно.",
    time: "День 0",
  },
  {
    icon: ClipboardList,
    title: "ТЗ и смета",
    desc: "Фиксируем структуру, экраны, интеграции и точную цену. Без сюрпризов.",
    time: "День 1",
  },
  {
    icon: Sparkles,
    title: "AI-разработка",
    desc: "Собираем сайт/бота/CRM с помощью AI. Показываем прогресс каждый день.",
    time: "День 2–5",
  },
  {
    icon: Rocket,
    title: "Запуск",
    desc: "Тестируем, подключаем домен, оплаты и аналитику. Принимаете работу.",
    time: "День 6–7",
  },
  {
    icon: LifeBuoy,
    title: "Поддержка",
    desc: "30 дней бесплатных правок и доработок. Дальше — по запросу.",
    time: "После",
  },
];

export function Process() {
  return (
    <section id="process" className="container mx-auto px-4 md:px-6 py-20 scroll-mt-20">
      <div className="text-center max-w-2xl mx-auto">
        <div className="inline-block rounded-full glass px-3 py-1 text-xs text-muted-foreground">
          Процесс
        </div>
        <h2 className="mt-4 text-4xl md:text-5xl font-bold tracking-tight">
          Как мы работаем — <span className="text-gradient">прозрачно и по шагам</span>
        </h2>
        <p className="mt-4 text-muted-foreground">
          От брифа до запуска — 3–7 дней. Никакой воды: каждый этап с конкретным результатом.
        </p>
      </div>

      <div className="mt-12 grid gap-5 md:grid-cols-3 lg:grid-cols-5">
        {steps.map((s, i) => (
          <div key={s.title} className="glass rounded-3xl p-6 relative">
            <div className="absolute -top-3 left-6 rounded-full bg-gradient-brand text-primary-foreground text-xs font-semibold px-3 py-1 shadow-glow">
              {String(i + 1).padStart(2, "0")}
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary text-primary mt-2">
              <s.icon className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-base font-semibold">{s.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
            <div className="mt-4 text-xs text-muted-foreground/80">{s.time}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
