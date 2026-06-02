/**
 * Яндекс.Метрика — заглушка, готовая к подключению.
 *
 * Чтобы включить:
 * 1. Создать счётчик на https://metrika.yandex.ru
 * 2. Установить в .env переменную VITE_YANDEX_METRIKA_ID=12345678
 * 3. Перезапустить dev / опубликовать сайт
 *
 * Цели для отслеживания (создайте в интерфейсе Метрики):
 *  - tg_click            — клик по ссылкам t.me/AiProfiGrup_bot
 *  - quiz_complete       — отправка квиза в Telegram
 *  - calc_request        — клик «Получить расчёт в Telegram»
 *  - lead_magnet_download — скачивание PDF
 *  - contact_submit      — отправка формы заявки
 *
 * Хелпер для отправки события из кода:
 *   import { ymGoal } from "@/components/site/YandexMetrika";
 *   ymGoal("tg_click");
 */

const ID = import.meta.env.VITE_YANDEX_METRIKA_ID as string | undefined;

declare global {
  interface Window {
    ym?: (id: number, action: string, ...args: unknown[]) => void;
  }
}

export function ymGoal(goal: string, params?: Record<string, unknown>) {
  if (typeof window === "undefined" || !ID || !window.ym) return;
  window.ym(Number(ID), "reachGoal", goal, params);
}

export function YandexMetrika() {
  if (!ID) return null;
  const code = `
(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
m[i].l=1*new Date();
for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
(window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");
ym(${Number(ID)}, "init", { clickmap:true, trackLinks:true, accurateTrackBounce:true, webvisor:true });
`.trim();

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: code }} />
      <noscript>
        <div>
          <img
            src={`https://mc.yandex.ru/watch/${ID}`}
            style={{ position: "absolute", left: "-9999px" }}
            alt=""
          />
        </div>
      </noscript>
    </>
  );
}
