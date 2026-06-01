import { useMemo, useState } from "react";
import { Send } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";

const serviceTypes = ["Сайт", "Telegram-бот", "CRM для компании"] as const;
type Service = (typeof serviceTypes)[number];
const siteTypes = ["Лендинг", "Корпоративный", "Каталог", "Квиз-воронка", "AI-воронка"] as const;
const integrations = ["Оплаты", "Telegram", "AI-ассистент", "Аналитика", "Email-рассылки"] as const;

// Базовые цены — средние по таблице рынка РФ 2025–2026
const serviceBase: Record<Service, number> = {
  "Сайт": 30000,           // средний полный лендинг
  "Telegram-бот": 42000,    // средний бот (оплата, рассылки)
  "CRM для компании": 90000, // CRM-система с воронкой и аналитикой
};

const activeBtn =
  "bg-[linear-gradient(135deg,hsl(262_85%_62%),hsl(245_80%_58%))] text-white shadow-[0_8px_24px_-8px_hsl(262_85%_62%/0.6)]";
const idleBtn = "bg-secondary text-muted-foreground hover:text-foreground";

export function Calculator() {
  const [services, setServices] = useState<Service[]>(["Сайт"]);
  const [bundle, setBundle] = useState(false);
  const [site, setSite] = useState<(typeof siteTypes)[number]>("Лендинг");
  const [pages, setPages] = useState(5);
  const [picks, setPicks] = useState<string[]>(["CRM", "Telegram"]);

  const toggleService = (s: Service) =>
    setServices((prev) => {
      if (prev.includes(s)) {
        const next = prev.filter((x) => x !== s);
        // если был полный набор и сняли одну — бандл больше не активен
        if (prev.length === serviceTypes.length) setBundle(false);
        return next;
      }
      const next = [...prev, s];
      // если добрали все три вручную — автоматически включаем бандл
      if (next.length === serviceTypes.length) setBundle(true);
      return next;
    });

  const toggleBundle = () => {
    if (bundle) {
      setBundle(false);
      setServices([]);
    } else {
      setServices([...serviceTypes]);
      setBundle(true);
    }
  };

  const toggle = (i: string) =>
    setPicks((p) => (p.includes(i) ? p.filter((x) => x !== i) : [...p, i]));

  const hasSite = services.includes("Сайт");
  const effectiveBundle = bundle && services.length === serviceTypes.length;

  const calc = useMemo(() => {
    const baseSite = { Лендинг: 1, Корпоративный: 2.4, Каталог: 3.0, "Квиз-воронка": 0.8, "AI-воронка": 1.7 }[site];

    let servicesSum = 0;
    for (const s of services) {
      const base = serviceBase[s];
      servicesSum += s === "Сайт" ? base * baseSite : base;
    }

    // итоговый множитель скидки
    const bundleDiscount = effectiveBundle
      ? 0.75
      : services.length >= 3
      ? 0.85
      : services.length === 2
      ? 0.92
      : 1;

    const pagesCost = hasSite ? pages * 4000 : 0;
    const integrationsCost = picks.length * 6000;

    const ours = Math.round(((servicesSum + pagesCost + integrationsCost) * bundleDiscount) / 1000) * 1000;
    const market = Math.round((ours * 3.0) / 1000) * 1000;
    const save = market > 0 ? Math.round(((market - ours) / market) * 100) : 0;
    return { ours, market, save, bundleDiscount };
  }, [services, site, pages, picks, hasSite, effectiveBundle]);

  const fmt = (n: number) => n.toLocaleString("ru-RU") + " ₽";

  return (
    <section className="container mx-auto px-4 md:px-6 py-20">
      <div className="text-center max-w-2xl mx-auto">
        <div className="inline-block rounded-full glass px-3 py-1 text-xs text-muted-foreground">Калькулятор</div>
        <h2 className="mt-4 text-4xl md:text-5xl font-bold tracking-tight">
          Посчитайте, сколько <span className="text-gradient">сэкономите с AI</span>
        </h2>
        <p className="mt-4 text-muted-foreground">
          Можно выбрать несколько услуг сразу — посчитаем комплексно и со скидкой.
        </p>
      </div>

      <div className="mt-12 grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3 glass rounded-3xl p-5 md:p-8 space-y-6">
          <div>
            <div className="text-sm font-medium mb-2">
              Что нужно? <span className="text-muted-foreground font-normal">(можно несколько)</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {serviceTypes.map((s) => {
                const active = services.includes(s);
                return (
                  <button
                    key={s}
                    onClick={() => toggleService(s)}
                    aria-pressed={active}
                    className={`rounded-full px-3 md:px-4 py-2 text-xs md:text-sm font-medium transition ${
                      active ? activeBtn : idleBtn
                    }`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                onClick={toggleBundle}
                aria-pressed={effectiveBundle}
                className={`rounded-full px-3 md:px-4 py-2 text-xs md:text-sm font-medium transition ${
                  effectiveBundle ? activeBtn : idleBtn
                }`}
              >
                Автоворонка продаж (сайт + бот + CRM)
              </button>
              <span className="text-xs text-muted-foreground">— выгоднее на 25%</span>
            </div>
          </div>

          {hasSite && (
            <div>
              <div className="text-sm font-medium mb-2">Тип сайта</div>
              <div className="flex flex-wrap gap-2">
                {siteTypes.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSite(s)}
                    className={`rounded-full px-3 md:px-4 py-2 text-xs md:text-sm font-medium transition ${
                      site === s ? activeBtn : idleBtn
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {hasSite && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-medium">Количество страниц</div>
                <div className="text-sm text-gradient font-semibold">{pages}</div>
              </div>
              <Slider
                value={[pages]}
                onValueChange={(v) => setPages(v[0])}
                min={1}
                max={20}
                step={1}
              />
            </div>
          )}

          <div>
            <div className="text-sm font-medium mb-3">Нужные интеграции</div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {integrations.map((i) => (
                <label
                  key={i}
                  className="flex items-center gap-3 rounded-xl bg-secondary/60 px-3 py-2 cursor-pointer"
                >
                  <Checkbox checked={picks.includes(i)} onCheckedChange={() => toggle(i)} />
                  <span className="text-sm">{i}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 glass rounded-3xl p-5 md:p-8 flex flex-col">
          <div className="text-sm text-muted-foreground">Ваш расчёт</div>

          <div className="mt-4 flex flex-wrap gap-1.5">
            {services.map((s) => (
              <span key={s} className="rounded-full bg-secondary px-2.5 py-1 text-xs text-foreground/80">
                {s}
              </span>
            ))}
            {effectiveBundle && (
              <span className="rounded-full bg-primary/15 px-2.5 py-1 text-xs text-primary font-medium">
                Автоворонка продаж
              </span>
            )}
          </div>

          <div className="mt-6">
            <div className="text-xs text-muted-foreground">Средняя цена по рынку</div>
            <div className="text-xl md:text-2xl font-semibold text-muted-foreground line-through">
              {fmt(calc.market)}
            </div>
          </div>

          <div className="mt-6">
            <div className="text-xs text-muted-foreground">AI-Profigrup</div>
            <div className="text-3xl md:text-4xl font-bold text-gradient">{fmt(calc.ours)}</div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-success/10 px-3 py-1 text-sm text-success">
              Экономия {calc.save}%
            </span>
            {calc.bundleDiscount < 1 && (
              <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm text-primary">
                {effectiveBundle ? "Автоворонка" : "Комплекс"} −{Math.round((1 - calc.bundleDiscount) * 100)}%
              </span>
            )}
          </div>

          <a href="https://t.me/sabutorin45" target="_blank" rel="noreferrer" className="mt-auto pt-8">
            <Button className="w-full bg-gradient-brand text-primary-foreground rounded-full shadow-glow">
              <Send className="mr-2 h-4 w-4" /> Получить точный расчёт в Telegram
            </Button>
          </a>
          <p className="mt-3 text-xs text-muted-foreground">
            Расчёт предварительный. Точная цена — после короткого брифа в Telegram.
          </p>
        </div>
      </div>
    </section>
  );
}
