import { createFileRoute } from "@tanstack/react-router";
import { Camera, Check, Clapperboard, Code2, Layers3, Send } from "lucide-react";
import { useState } from "react";
import { bundleSavings, money, packagePrices, productNames, shopOrder, type Mode, type PackageCode } from "@/lib/shop-catalog";

export const Route = createFileRoute("/shop")({
  head: () => ({
    meta: [
      { title: "Магазин «Нейросотрудник» — AI-Profigrup" },
      { name: "description", content: "Выберите навыки ИИ-сотрудника для Telegram и рассчитайте стоимость комплектации." },
    ],
    links: [{ rel: "canonical", href: "https://aiprofigrup.ru/shop" }],
  }),
  component: Shop,
});

const packages = [
  { code: "photo", name: productNames.photo, price: packagePrices.photo, icon: Camera, description: "Генерация и правка изображений для постов, карточек товаров и рекламы.", items: ["Изображения через kie.ai", "Промпты для генерации"] },
  { code: "video", name: productNames.video, price: packagePrices.video, icon: Clapperboard, description: "Ролики из текста или изображения, озвучка и музыка.", items: ["Видео и анимация фото", "Озвучка, музыка, сборка сцен"] },
  { code: "design", name: productNames.design, price: packagePrices.design, icon: Layers3, description: "Готовые слайды каруселей в цветах вашего бренда.", items: ["Оформление текста в PNG", "Карусели 1080 × 1350"] },
  { code: "dev", name: productNames.dev, price: packagePrices.dev, icon: Code2, description: "Навыки для задач сайта и веб-интерфейса.", items: ["Фронтенд-дизайн", "Работа с кодом и веб-приложениями"] },
] as const;

const modes: { id: Mode; label: string }[] = [
  { id: "custom", label: "Собрать набор" },
  { id: "all", label: "Всё включено" },
  { id: "addons", label: "Докупить навыки" },
  { id: "updates", label: "Продлить обновления" },
];

function Shop() {
  const [mode, setMode] = useState<Mode>("custom");
  const [selected, setSelected] = useState<PackageCode[]>([]);
  const { rows, total, checkout, sku } = shopOrder(mode, selected);
  const showPacks = mode === "custom" || mode === "addons";

  function toggle(code: PackageCode) {
    setSelected((current) => current.includes(code) ? current.filter((item) => item !== code) : [...current, code]);
  }

  return (
    <main className="min-h-screen overflow-hidden">
      <section className="relative border-b border-border/60 bg-secondary/30">
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,color-mix(in_srgb,var(--color-primary)_10%,transparent),transparent_60%)]" />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-5 py-12 sm:px-8 sm:py-16 lg:grid-cols-[1.3fr_.7fr] lg:items-end">
          <div>
            <p className="mb-3 text-sm font-semibold tracking-wide text-primary">Магазин AI-Profigrup</p>
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-6xl">Нейросотрудник</h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">ИИ-сотрудник в вашем Telegram. Пишет тексты, ищет информацию и помогает с маркетингом. Добавьте навыки под задачи вашего бизнеса.</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a href="#catalog" className="inline-flex min-h-12 items-center rounded-full border border-primary/60 px-6 py-3 font-semibold text-primary hover:bg-primary/10">Выбрать комплектацию</a>
              <a href="#payment" className="inline-flex min-h-12 items-center rounded-full bg-primary px-7 py-3 font-bold text-primary-foreground shadow-sm hover:opacity-90">Оплатить</a>
            </div>
          </div>
          <div className="rounded-3xl border border-border bg-background/90 p-6 sm:p-7">
            <p className="text-sm font-medium text-muted-foreground">Базовый набор</p>
            <p className="mt-2 text-4xl font-bold tracking-tight">{money(packagePrices.base)}</p>
            <ul className="mt-5 space-y-2.5 text-sm text-muted-foreground">
              {["Разовая покупка", "Месяц обновлений в комплекте", "Установка на свой сервер"].map((item) => (
                <li className="flex items-center gap-2" key={item}><Check className="size-4 shrink-0 text-primary" aria-hidden />{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section id="catalog" className="mx-auto max-w-7xl scroll-mt-20 px-5 py-12 sm:px-8">
        <h2 className="text-3xl font-bold tracking-tight">Комплектация</h2>
        <div className="mt-5 flex flex-wrap gap-2" aria-label="Вариант покупки">
          {modes.map(({ id, label }) => (
            <button type="button" key={id} aria-pressed={mode === id} onClick={() => setMode(id)}
              className={"rounded-full border px-4 py-2 text-sm font-semibold transition-colors " + (mode === id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:bg-secondary")}>
              {label}
            </button>
          ))}
        </div>

        <div className="mt-7 grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_390px]">
          <div className="space-y-4">
            {mode === "custom" && (
              <article className="rounded-2xl border border-border bg-secondary/30 p-5 sm:p-6">
                <div className="flex flex-wrap items-baseline justify-between gap-2"><h3 className="text-xl font-bold">Базовый</h3><p className="font-semibold">{money(packagePrices.base)}</p></div>
                <p className="mt-2 text-muted-foreground">Посты и тексты каруселей, поиск в интернете, исследование конкурентов и рынка, первые продажи, контент-планы и меню в Telegram.</p>
              </article>
            )}
            {mode === "addons" && <p className="rounded-2xl border border-border bg-secondary/30 p-4 text-muted-foreground">Дополнения устанавливаются поверх уже купленного базового набора.</p>}
            {showPacks && (
              <div className="grid gap-4 sm:grid-cols-2">
                {packages.map(({ code, name, price, icon: Icon, description, items }) => {
                  const checked = selected.includes(code);
                  return (
                    <label key={code} className={"flex cursor-pointer flex-col rounded-2xl border p-5 transition-colors sm:p-6 " + (checked ? "border-primary bg-primary/5" : "border-border bg-background hover:bg-secondary/30")}>
                      <div className="flex items-start justify-between gap-3">
                        <Icon aria-hidden className="size-6 text-primary" />
                        <input type="checkbox" checked={checked} onChange={() => toggle(code)} aria-label={"Добавить " + name} className="size-5 shrink-0 accent-primary" />
                      </div>
                      <h3 className="mt-4 text-lg font-bold">{name}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{description}</p>
                      <ul className="mb-4 mt-3 space-y-1.5 text-sm">
                        {items.map((item) => <li className="flex items-center gap-2" key={item}><Check aria-hidden className="size-4 shrink-0 text-primary" />{item}</li>)}
                      </ul>
                      <p className="mt-auto font-semibold">+{money(price)}</p>
                    </label>
                  );
                })}
              </div>
            )}
            {mode === "all" && (
              <article className="rounded-2xl border border-primary/30 bg-primary/5 p-6">
                <h3 className="text-2xl font-bold">Всё включено</h3>
                <p className="mt-2 text-muted-foreground">Базовый и четыре дополнительных пакета.</p>
                <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                  {["Базовый", ...packages.map(({ name }) => name)].map((name) => <li className="flex items-center gap-2" key={name}><Check aria-hidden className="size-4 text-primary" />{name}</li>)}
                </ul>
                <p className="mt-5 font-semibold text-primary">Экономия {money(bundleSavings)} при покупке набором</p>
              </article>
            )}
            {mode === "updates" && (
              <article className="rounded-2xl border border-border bg-secondary/30 p-6">
                <h3 className="text-xl font-bold">Обновления на месяц</h3>
                <p className="mt-2 text-muted-foreground">Продление доступа к новым версиям купленных пакетов. Первый месяц уже входит в покупку продукта.</p>
              </article>
            )}
          </div>

          <aside id="payment" aria-labelledby="payment-title" className="scroll-mt-24 rounded-3xl border border-primary/50 bg-card p-6 shadow-xl shadow-primary/10 ring-1 ring-primary/15 target:ring-2 target:ring-primary/60 sm:p-8 lg:sticky lg:top-24">
            <h3 id="payment-title" className="text-2xl font-bold">Ваш заказ</h3>
            <div aria-live="polite">
              {rows.length ? (
                <ul className="mt-5 space-y-3 text-sm">
                  {rows.map(({ name, price }) => <li className="flex justify-between gap-3" key={name}><span>{name}</span><span className="whitespace-nowrap font-medium">{money(price)}</span></li>)}
                </ul>
              ) : <p className="mt-4 text-sm text-muted-foreground">Выберите хотя бы одно дополнение.</p>}
              <div className="mt-5 flex items-baseline justify-between gap-2 border-t border-border pt-4">
                <span className="font-medium">Итого</span><strong className="text-4xl tracking-tight">{money(total)}</strong>
              </div>
            </div>
            {mode === "custom" && total > packagePrices.all && (
              <button type="button" onClick={() => setMode("all")} className="mt-3 text-left text-sm font-semibold text-primary underline underline-offset-4">
                Перейти на «Всё включено» и сэкономить {money(total - packagePrices.all)}
              </button>
            )}
            {checkout && mode !== "updates" && (
              <a href={"/api/shop-transfer?sku=" + encodeURIComponent(sku)} className="mt-5 flex min-h-14 items-center justify-center rounded-xl bg-primary px-5 py-4 text-center text-lg font-bold text-primary-foreground shadow-sm hover:opacity-90">
                Оплата наличными
              </a>
            )}
            {checkout ? (
              <a href={checkout} target="_blank" rel="noreferrer" className={"mt-4 flex min-h-12 items-center justify-center gap-2 rounded-xl px-4 py-3 text-center font-semibold " + (mode === "updates" ? "bg-primary text-primary-foreground hover:opacity-90" : "border border-border text-foreground hover:bg-secondary/50")}>
                <Send className="size-4" aria-hidden /> Оформить в Telegram
              </a>
            ) : (
              <button type="button" disabled className="mt-5 w-full rounded-xl bg-secondary px-4 py-3 font-semibold text-muted-foreground">Оформить в Telegram</button>
            )}
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">Telegram откроет готовый текст заявки. Отправьте его продавцу, чтобы согласовать оплату и получить доступ.</p>
          </aside>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-14 sm:px-8">
        <h2 className="text-2xl font-bold tracking-tight">Перед покупкой</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {[
            ["Где работает", "На вашем сервере с OpenClaw. Общаетесь с агентом через своего бота в Telegram."],
            ["Что оплачивается отдельно", "Аренда сервера, запросы к выбранной нейросети и генерации через kie.ai оплачиваются по вашим тарифам."],
            ["Как получить доступ", "После подтверждения оплаты продавец отправит приглашения в закрытые репозитории выбранных пакетов и инструкцию по установке."],
          ].map(([title, text]) => <article className="rounded-2xl border border-border p-5" key={title}><h3 className="font-semibold">{title}</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p></article>)}
        </div>
      </section>
    </main>
  );
}
