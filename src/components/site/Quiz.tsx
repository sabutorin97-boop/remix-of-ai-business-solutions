import { useState } from "react";
import { ArrowLeft, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

const steps = [
  { q: "Какой у вас бизнес?", options: ["Строительство/ремонт", "Мебель/кухни/окна", "Услуги/локальный бизнес", "Эксперт/коуч/консультант", "Другое"] },
  { q: "Что нужно сделать?", options: ["Сайт с нуля", "Переделать существующий", "Telegram-бот", "CRM для компании", "Автоворонка продаж (сайт+бот+CRM)"] },
  { q: "Какая основная цель?", options: ["Больше заявок", "Автоматизировать продажи", "Сократить расходы", "Запустить новый продукт"] },
  { q: "Бюджет на проект?", options: ["До 50 000 ₽", "50–150 000 ₽", "150–300 000 ₽", "300 000 ₽+"] },
  { q: "Когда нужен результат?", options: ["Срочно — на этой неделе", "В течение месяца", "1–2 месяца", "Просто изучаю варианты"] },
  { q: "Нужны интеграции?", options: ["CRM", "Telegram + оплаты", "Аналитика", "AI-ассистент", "Пока не знаю"] },
  { q: "Куда отправить расчёт?", options: ["Telegram", "WhatsApp", "Email", "Позвонить"] },
];

export function Quiz() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const done = step >= steps.length;

  const pct = done ? 100 : Math.round((step / steps.length) * 100);

  const pick = (opt: string) => {
    setAnswers((a) => [...a.slice(0, step), opt]);
    setStep((s) => s + 1);
  };

  return (
    <section id="quiz" className="container mx-auto px-4 md:px-6 py-20">
      <div className="text-center max-w-2xl mx-auto">
        <div className="inline-block rounded-full glass px-3 py-1 text-xs text-muted-foreground">Квиз</div>
        <h2 className="mt-4 text-4xl md:text-5xl font-bold tracking-tight">
          7 шагов — и вы получите <span className="text-gradient">персональный расчёт</span>
        </h2>
      </div>

      <div className="mt-12 max-w-2xl mx-auto glass rounded-3xl p-6 md:p-10">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
          <span>Вопрос {Math.min(step + 1, steps.length)} из {steps.length}</span>
          <span>{pct}%</span>
        </div>
        <Progress value={pct} className="h-1.5" />

        {!done ? (
          <>
            <h3 className="mt-8 text-2xl font-semibold">{steps[step].q}</h3>
            <div className="mt-6 grid gap-3">
              {steps[step].options.map((opt) => (
                <button
                  key={opt}
                  onClick={() => pick(opt)}
                  className="text-left rounded-2xl border border-border bg-secondary/40 px-5 py-4 hover:border-primary/60 hover:bg-secondary transition"
                >
                  {opt}
                </button>
              ))}
            </div>
            <div className="mt-6">
              <Button
                variant="ghost"
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                disabled={step === 0}
                className="text-muted-foreground"
              >
                <ArrowLeft className="mr-2 h-4 w-4" /> Назад
              </Button>
            </div>
          </>
        ) : (
          <div className="mt-8 text-center">
            <h3 className="text-2xl font-semibold">Готово!</h3>
            <p className="mt-2 text-muted-foreground">
              Отправьте свои ответы в Telegram — я подготовлю расчёт в течение часа.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {answers.map((a, i) => (
                <span key={i} className="rounded-full bg-secondary px-3 py-1 text-xs text-muted-foreground">
                  {a}
                </span>
              ))}
            </div>
            <a href="https://t.me/sabutorin45" target="_blank" rel="noreferrer" className="mt-8 inline-block">
              <Button className="bg-gradient-brand text-primary-foreground rounded-full shadow-glow">
                <Send className="mr-2 h-4 w-4" /> Отправить в Telegram
              </Button>
            </a>
            <div className="mt-4">
              <button
                onClick={() => { setStep(0); setAnswers([]); }}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Начать заново
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
