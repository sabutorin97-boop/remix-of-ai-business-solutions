import { Megaphone, Send } from "lucide-react";
import { CHANNEL_LINKS, CHANNEL_NAME } from "@/lib/telegram-channel";
import { ymGoal } from "@/components/site/YandexMetrika";

/**
 * Блок с приглашением в Telegram-канал в конце статьи блога.
 *
 * Ведёт прямо в канал, а не на посадочную /tg: та нужна, чтобы прогреть
 * холодного человека с рекламы, а читатель статьи уже прогрет, и лишний
 * шаг только теряет часть таких людей.
 */
export function ChannelCta() {
  return (
    <div className="mt-10 rounded-3xl glass p-6 md:p-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-6">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-brand text-primary-foreground">
          <Megaphone className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <div className="text-lg font-semibold">Такие разборы выходят в канале раньше</div>
          <p className="mt-2 text-sm text-muted-foreground">
            {CHANNEL_NAME} — кейсы внедрения AI, готовые промпты и новости рынка без шума. Пара
            постов в неделю, без спама.
          </p>
          <a
            href={CHANNEL_LINKS.site}
            target="_blank"
            rel="noreferrer"
            onClick={() => ymGoal("tg_channel_click", { place: "blog_post" })}
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-gradient-brand px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-glow transition-all duration-300 hover:scale-[1.03] active:scale-[0.98]"
          >
            <Send className="h-4 w-4" /> Подписаться на канал
          </a>
        </div>
      </div>
    </div>
  );
}
