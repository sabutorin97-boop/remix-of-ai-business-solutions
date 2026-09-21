import { Link } from "@tanstack/react-router";
import { Megaphone, Send } from "lucide-react";
import { channelHref } from "@/lib/telegram-channel";
import { ymGoal } from "@/components/site/YandexMetrika";

export function Footer() {
  return (
    <footer className="border-t border-border/40 mt-24">
      <div className="container mx-auto px-4 md:px-6 py-12">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
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
            {/* Левая колонка, а не «Связаться»: правый нижний угол перекрывает
                плавающий виджет «Спросить Макса». Кнопка та же, что у заявки,
                но в другой колонке — так они не читаются как два равных
                варианта одного действия. */}
            <a
              href={channelHref("site", "footer")}
              target="_blank"
              rel="noreferrer nofollow"
              aria-label="Открыть Telegram-канал про AI"
              onClick={() => ymGoal("tg_channel_click", { place: "footer" })}
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-gradient-brand px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-glow transition-all duration-300 hover:scale-[1.03] active:scale-[0.98]"
            >
              <Megaphone className="h-4 w-4" /> Telegram-канал про AI
            </a>
          </div>

          <div>
            {/* Страницы услуг: до этого ссылки на них были только в блоке
                «Услуги» на главной, и поисковик подолгу не доходил до них
                вглубь. Подвал стоит на каждой странице — путь стал короче. */}
            <div className="text-sm font-semibold mb-3">Услуги</div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link to="/ai-websites" className="hover:text-foreground">
                  AI-сайты
                </Link>
              </li>
              <li>
                <Link to="/telegram-bots" className="hover:text-foreground">
                  Telegram-боты
                </Link>
              </li>
              <li>
                <Link to="/crm" className="hover:text-foreground">
                  CRM для компании
                </Link>
              </li>
              <li>
                <Link to="/geo" className="hover:text-foreground">
                  GEO/AIO-оптимизация
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <div className="text-sm font-semibold mb-3">Навигация</div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link to="/services" className="hover:text-foreground">
                  Все услуги
                </Link>
              </li>
              <li>
                <Link to="/blog" className="hover:text-foreground">
                  Блог
                </Link>
              </li>
              <li>
                <Link to="/cases" className="hover:text-foreground">
                  Кейсы
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-foreground">
                  Контакты
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="hover:text-foreground">
                  Политика обработки персональных данных
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <div className="text-sm font-semibold mb-3">Связаться</div>
            <a
              href="https://t.me/AiProfiGrup_bot"
              target="_blank"
              rel="noreferrer nofollow"
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
