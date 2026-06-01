import { Link } from "@tanstack/react-router";
import { Send } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border/40 mt-24">
      <div className="container mx-auto px-4 md:px-6 py-12">
        <div className="grid gap-10 md:grid-cols-3">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-brand text-sm font-bold text-primary-foreground">
                AI
              </div>
              <div>
                <div className="text-sm font-semibold">AI-Profigrup</div>
                <div className="text-xs text-muted-foreground">АИ-студия разработки</div>
              </div>
            </div>
            <p className="mt-4 text-sm text-muted-foreground max-w-xs">
              Сайты, Telegram-боты и AI-автоматизация для бизнеса. Запуск за 3–7 дней.
            </p>
          </div>

          <div>
            <div className="text-sm font-semibold mb-3">Навигация</div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/services" className="hover:text-foreground">Услуги</Link></li>
              <li><Link to="/cases" className="hover:text-foreground">Кейсы</Link></li>
              <li><Link to="/contact" className="hover:text-foreground">Контакты</Link></li>
            </ul>
          </div>

          <div>
            <div className="text-sm font-semibold mb-3">Связаться</div>
            <a
              href="https://t.me/AiProfiGrup_bot"
              target="_blank"
              rel="noreferrer"
              aria-label="Написать в Telegram"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-brand px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-glow transition-all duration-300 hover:scale-[1.03] active:scale-[0.98]"
            >
              <Send className="h-4 w-4" /> Написать в Telegram
            </a>
          </div>

        </div>

        <div className="mt-10 border-t border-border/40 pt-6 text-xs text-muted-foreground flex flex-col md:flex-row justify-between gap-2">
          <span>© {new Date().getFullYear()} AI-Profigrup. Все права защищены.</span>
          <span>Сделано с AI · Запуск за 3–7 дней</span>
        </div>
      </div>
    </footer>
  );
}
