import { Send, Share2 } from "lucide-react";
import { ymGoal } from "@/components/site/YandexMetrika";

/**
 * Кнопки «Поделиться» под статьёй блога — Telegram и ВКонтакте.
 * Ссылки открываются в новой вкладке; клик отправляет цель в Метрику.
 */
export function SharePost({ url, title }: { url: string; title: string }) {
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);
  const telegramHref = `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`;
  const vkHref = `https://vk.com/share.php?url=${encodedUrl}&title=${encodedTitle}`;

  const base =
    "inline-flex items-center gap-2 rounded-full glass px-4 py-2 text-sm font-medium transition-all duration-300 hover:scale-[1.03] active:scale-[0.98]";

  return (
    <div className="mt-10 flex flex-wrap items-center gap-3">
      <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
        <Share2 className="h-4 w-4" /> Поделиться:
      </span>
      <a
        href={telegramHref}
        target="_blank"
        rel="noreferrer"
        onClick={() => ymGoal("blog_share", { network: "telegram" })}
        className={base}
      >
        <Send className="h-4 w-4" /> Telegram
      </a>
      <a
        href={vkHref}
        target="_blank"
        rel="noreferrer"
        onClick={() => ymGoal("blog_share", { network: "vk" })}
        className={base}
      >
        ВКонтакте
      </a>
    </div>
  );
}
