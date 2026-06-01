import { useState, type FormEvent } from "react";
import { Send } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

export function ContactForm() {
  const [agree, setAgree] = useState(true);
  const [sending, setSending] = useState(false);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!agree) {
      toast.error("Нужно согласие на обработку данных");
      return;
    }
    setSending(true);
    setTimeout(() => {
      toast.success("Заявка отправлена! Открываю Telegram для связи.");
      window.open("https://t.me/sabutorin45", "_blank");
      setSending(false);
      (e.target as HTMLFormElement).reset();
    }, 400);
  };

  return (
    <section id="contact" className="container mx-auto px-4 md:px-6 py-20 scroll-mt-20">
      <div className="max-w-3xl mx-auto">
        <div className="text-center">
          <div className="inline-block rounded-full glass px-3 py-1 text-xs text-muted-foreground">Заявка</div>
          <h2 className="mt-4 text-4xl md:text-5xl font-bold tracking-tight">
            Оставьте заявку — <span className="text-gradient">отвечу лично</span>
          </h2>
          <p className="mt-4 text-muted-foreground">
            Отвечу в течение часа в рабочее время. Бесплатная консультация и расчёт под ваши задачи.
          </p>
        </div>

        <form onSubmit={submit} className="mt-10 glass rounded-3xl p-6 md:p-8 space-y-5">
          <div>
            <label className="text-sm font-medium">Как к вам обращаться *</label>
            <Input required placeholder="Ваше имя" className="mt-2 bg-secondary/60 border-border" />
          </div>
          <div>
            <label className="text-sm font-medium">Telegram / телефон / e-mail *</label>
            <Input required placeholder="@username, +7..., name@mail.com" className="mt-2 bg-secondary/60 border-border" />
          </div>
          <div>
            <label className="text-sm font-medium">Кратко о задаче (необязательно)</label>
            <Textarea placeholder="Что нужно сделать?" rows={4} className="mt-2 bg-secondary/60 border-border" />
          </div>
          <label className="flex items-start gap-3 text-xs text-muted-foreground">
            <Checkbox checked={agree} onCheckedChange={(v) => setAgree(!!v)} className="mt-0.5" />
            <span>
              Я согласен на обработку персональных данных в соответствии с{" "}
              <Link
                to="/privacy"
                target="_blank"
                className="text-foreground underline underline-offset-4 hover:text-gradient"
              >
                Политикой обработки персональных данных
              </Link>
              . Контакт используется только для ответа на заявку.
            </span>
          </label>
          <Button
            type="submit"
            disabled={sending}
            className="w-full bg-gradient-brand text-primary-foreground rounded-full shadow-glow"
          >
            <Send className="mr-2 h-4 w-4" /> Отправить заявку
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Или напишите напрямую в{" "}
            <a
              href="https://t.me/sabutorin45"
              target="_blank"
              rel="noreferrer"
              aria-label="Написать в Telegram"
              className="text-foreground underline underline-offset-4 hover:text-gradient"
            >
              Telegram
            </a>
          </p>

        </form>
      </div>
    </section>
  );
}
