import { useState, type FormEvent } from "react";
import { Download, FileText, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";

const PDF_URL = "/lead-magnet-10-oshibok.pdf";

const bullets = [
  "10 типовых ошибок, которые сжигают бюджет на сайт и бота",
  "Чек-листы: что спросить у подрядчика до подписания договора",
  "Где реально теряются деньги в воронке и как это починить",
];

export function LeadMagnet() {
  const [agree, setAgree] = useState(true);
  const [sent, setSent] = useState(false);

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!agree) {
      toast.error("Нужно согласие на обработку данных");
      return;
    }
    setSent(true);
    toast.success("Готово! Ссылка на PDF открыта.");
    window.open(PDF_URL, "_blank");
    (e.currentTarget as HTMLFormElement).reset();
  };

  return (
    <section
      id="lead-magnet"
      className="container mx-auto px-4 md:px-6 py-20 scroll-mt-20"
    >
      <div className="glass rounded-3xl p-6 md:p-10 grid gap-8 lg:grid-cols-2 lg:items-center bg-[linear-gradient(135deg,hsl(262_85%_62%/0.08),hsl(245_80%_58%/0.08))] border border-primary/30">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/15 text-primary px-3 py-1 text-xs font-medium">
            <FileText className="h-3.5 w-3.5" />
            Бесплатный PDF · 2 страницы
          </div>
          <h2 className="mt-4 text-3xl md:text-4xl font-bold tracking-tight">
            Чеклист: <span className="text-gradient">10 ошибок при заказе сайта или бота</span>
          </h2>
          <p className="mt-3 text-muted-foreground">
            Короткий гайд по опыту 50+ проектов. Прочитаете за 5 минут — сэкономите от 50 000 ₽
            на следующем заказе.
          </p>
          <ul className="mt-5 space-y-2">
            {bullets.map((b) => (
              <li key={b} className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>

        <form
          onSubmit={submit}
          className="glass rounded-2xl p-5 md:p-6 space-y-4 bg-background/40"
        >
          <div>
            <label className="text-sm font-medium">Email или Telegram</label>
            <Input
              required
              placeholder="name@mail.com или @username"
              className="mt-2 bg-secondary/60 border-border"
              maxLength={120}
            />
          </div>
          <label className="flex items-start gap-3 text-xs text-muted-foreground">
            <Checkbox
              checked={agree}
              onCheckedChange={(v) => setAgree(!!v)}
              className="mt-0.5"
            />
            <span>
              Согласен с{" "}
              <Link
                to="/privacy"
                target="_blank"
                className="text-foreground underline underline-offset-4"
              >
                обработкой персональных данных
              </Link>
              . Контакт используем только для отправки материалов.
            </span>
          </label>
          <Button
            type="submit"
            className="w-full bg-gradient-brand text-primary-foreground rounded-full shadow-glow"
          >
            <Download className="mr-2 h-4 w-4" />
            {sent ? "Скачать ещё раз" : "Скачать PDF бесплатно"}
          </Button>
          <a
            href={PDF_URL}
            target="_blank"
            rel="noreferrer"
            className="block text-center text-xs text-muted-foreground hover:text-foreground"
          >
            Или открыть PDF без формы
          </a>
        </form>
      </div>
    </section>
  );
}
