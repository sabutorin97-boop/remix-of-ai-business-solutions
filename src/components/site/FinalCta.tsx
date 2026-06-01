import { Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function FinalCta() {
  return (
    <section className="container mx-auto px-4 md:px-6 py-20">
      <div className="relative overflow-hidden rounded-3xl glass p-10 md:p-16 text-center">
        <div className="absolute inset-0 bg-gradient-brand opacity-20" />
        <div className="relative">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
            Готовы запустить <span className="text-gradient">AI-систему</span> для бизнеса?
          </h2>
          <p className="mt-4 max-w-2xl mx-auto text-muted-foreground">
            Расскажите о задаче — за 24 часа подготовим персональное предложение и план запуска.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <a href="https://t.me/sabutorin45" target="_blank" rel="noreferrer">
              <Button size="lg" className="bg-gradient-brand text-primary-foreground rounded-full shadow-glow">
                <Send className="mr-2 h-4 w-4" /> Консультация в Telegram
              </Button>
            </a>
            <a href="#quiz">
              <Button size="lg" variant="outline" className="rounded-full border-border bg-secondary/40">
                <Sparkles className="mr-2 h-4 w-4" /> Пройти квиз
              </Button>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
