const items = [
  { value: "50+", label: "проектов запущено" },
  { value: "3–7", label: "дней до запуска" },
  { value: "−70%", label: "стоимость vs рынок" },
  { value: "5×", label: "быстрее AI-разработка" },
  { value: "24/7", label: "поддержка после запуска" },
];

export function Metrics() {
  return (
    <section className="container mx-auto px-4 md:px-6 py-12">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
        {items.map((i) => (
          <div
            key={i.label}
            className="glass rounded-2xl p-5 text-center"
          >
            <div className="text-2xl md:text-3xl font-bold text-gradient">{i.value}</div>
            <div className="mt-1 text-xs text-muted-foreground">{i.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
