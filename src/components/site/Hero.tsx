import { Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import founder from "@/assets/founder.jpg";



export function Hero() {
  const chips = [
    "AI-разработка",
    "Экономия до 70%",
    "Поддержка после запуска",
    "Запуск за 3–7 дней",
  ];

  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 grid-bg opacity-60 pointer-events-none" />
      <div className="container mx-auto px-4 md:px-6 pt-10 md:pt-24 pb-14 md:pb-20 relative">
        <div className="grid items-center gap-10 md:gap-12 lg:grid-cols-2">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-xs text-foreground">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success/60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
              </span>
              AI-студия следующего поколения
            </div>

            <h1 className="mt-6 text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05]">
              <span className="lg:block">Создаю сайты</span>{" "}
              <span className="lg:block">
                и <span className="text-gradient">AI-системы</span>
              </span>{" "}
              <span className="lg:block">для бизнеса за 3–7 дней</span>
            </h1>

            <p className="mt-6 max-w-xl text-base md:text-lg text-muted-foreground">
              Сайты, Telegram-боты и AI-автоматизация, которые приводят клиентов и
              автоматизируют продажи. Без шаблонов и переплат.
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              {chips.map((c) => (
                <span
                  key={c}
                  className="rounded-full glass px-3 py-1.5 text-xs text-muted-foreground"
                >
                  {c}
                </span>
              ))}
            </div>

            <div className="mt-8 flex flex-col sm:flex-row flex-wrap gap-3">
              <a href="https://t.me/sabutorin45" target="_blank" rel="noreferrer" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  className="w-full sm:w-auto bg-gradient-brand text-primary-foreground hover:opacity-90 shadow-glow rounded-full"
                >
                  <Send className="mr-2 h-4 w-4" /> Получить консультацию в Telegram
                </Button>
              </a>
              <a href="#quiz" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto rounded-full border-border bg-secondary/40 hover:bg-secondary"
                >
                  <Sparkles className="mr-2 h-4 w-4" /> Пройти квиз и получить расчёт
                </Button>
              </a>
            </div>
          </div>

          <div className="relative">
            <div className="relative aspect-[4/5] max-w-xs sm:max-w-sm md:max-w-md mx-auto rounded-3xl overflow-hidden border border-border/60 shadow-glow">
              <img
                src={founder}
                alt="Основатель AI-Profigrup"
                width={1024}
                height={1280}
                className="h-full w-full object-cover"
              />
              <div className="absolute top-4 left-4 glass rounded-2xl px-4 py-2 text-xs">
                <div className="text-muted-foreground">AI-разработка</div>
                <div className="font-semibold text-foreground">в 5× быстрее</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
