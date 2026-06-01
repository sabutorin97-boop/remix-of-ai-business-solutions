const rows = [
  ["Скорость запуска", "1–3 месяца", "3–7 дней"],
  ["Стоимость", "от 150 000 ₽", "от 49 000 ₽"],
  ["Гибкость правок", "Долго и дорого", "Быстро, в день обращения"],
  ["Масштабируемость", "Ограничена", "Готова к росту"],
  ["AI-функции", "Чаще всего нет", "Встроены по умолчанию"],
  ["Автоматизация продаж", "Отдельный проект", "Сразу в комплекте"],
];

export function Compare() {
  return (
    <section className="container mx-auto px-4 md:px-6 py-20">
      <div className="text-center max-w-2xl mx-auto">
        <div className="inline-block rounded-full glass px-3 py-1 text-xs text-muted-foreground">Сравнение</div>
        <h2 className="mt-4 text-4xl md:text-5xl font-bold tracking-tight">
          Классика <span className="text-muted-foreground">vs</span>{" "}
          <span className="text-gradient">AI-разработка</span>
        </h2>
        <p className="mt-4 text-muted-foreground">
          Почему компании переходят на AI-стек и почему это не про потерю качества.
        </p>
      </div>

      {/* Desktop / tablet table */}
      <div className="mt-12 hidden md:block glass rounded-3xl overflow-hidden">
        <div className="grid grid-cols-3 bg-secondary/40 text-sm font-semibold">
          <div className="px-6 py-4 text-muted-foreground"> </div>
          <div className="px-6 py-4 text-muted-foreground">Классика</div>
          <div className="px-6 py-4 text-gradient">AI-Profigrup</div>
        </div>
        {rows.map(([label, a, b], i) => (
          <div
            key={label}
            className={`grid grid-cols-3 text-sm ${i % 2 ? "bg-background/30" : ""}`}
          >
            <div className="px-6 py-4 font-medium">{label}</div>
            <div className="px-6 py-4 text-muted-foreground">{a}</div>
            <div className="px-6 py-4 text-foreground font-medium">{b}</div>
          </div>
        ))}
      </div>

      {/* Mobile card-rows */}
      <div className="mt-10 md:hidden space-y-3">
        {rows.map(([label, a, b]) => (
          <div key={label} className="glass rounded-2xl p-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-[10px] uppercase text-muted-foreground/70">Классика</div>
                <div className="mt-1 text-muted-foreground">{a}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase text-muted-foreground/70">AI-Profigrup</div>
                <div className="mt-1 font-medium text-gradient">{b}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
