import { createFileRoute, notFound } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { ProfiAccountPreview } from "@/components/site/ProfiAccountPreview";
import { ProfiAdminPreview } from "@/components/site/ProfiAdminPreview";
import { ReactiveBriefPreview } from "@/components/site/ReactiveBriefPreview";
import { radarAuditQueries, radarBrief } from "@/lib/ai-radar";
import { addonCodes, productNames } from "@/lib/shop-catalog";

export const Route = createFileRoute("/profi-market-preview")({
  beforeLoad: () => {
    if (!import.meta.env.DEV) throw notFound();
  },
  head: () => ({
    meta: [
      { title: "Profi Market — предпросмотр" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ProfiMarketPreview,
});

function ProfiMarketPreview() {
  return (
    <div>
      <section className="mx-auto max-w-7xl px-5 py-12 sm:px-8">
        <h1 className="text-4xl font-bold">Profi Market — предпросмотр</h1>
        <p className="mt-3 max-w-prose text-muted-foreground">
          Локальное демо с примерными данными. Оплата, выдача доступа и обращения к AI выключены.
        </p>
        <nav aria-label="Разделы предпросмотра" className="mt-5 flex flex-wrap gap-4">
          <a className="underline" href="#reactive">РеАктив AI</a>
          <a className="underline" href="#radar">AI-Радар</a>
          <a className="underline" href="#licenses">Лицензии</a>
          <a className="underline" href="#account">Кабинет</a>
          <a className="underline" href="#admin">Калькулятор</a>
        </nav>
      </section>
      <div id="reactive"><ReactiveBriefPreview /></div>
      <RadarPreview />
      <LicensePreview />
      <div id="account"><ProfiAccountPreview /></div>
      <div id="admin"><ProfiAdminPreview /></div>
    </div>
  );
}

const radarFields = [
  { name: "business", label: "Компания", limit: 160 },
  { name: "website", label: "Сайт", limit: 500 },
  { name: "city", label: "Город", limit: 160 },
  { name: "category", label: "Товар или услуга", limit: 300 },
] as const;

function RadarPreview() {
  const [queries, setQueries] = useState<string[]>([]);
  const [error, setError] = useState("");

  function prepareQueries(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    const result = radarBrief.safeParse(data);
    setQueries(result.success ? radarAuditQueries(result.data).map(({ query }) => query) : []);
    setError(result.success ? "" : "Проверьте поля анкеты. Укажите полный адрес сайта с http:// или https://.");
  }

  return (
    <section id="radar" aria-labelledby="radar-title" className="mx-auto max-w-3xl px-5 py-12 sm:px-8">
      <h2 id="radar-title" className="text-3xl font-bold">AI-Радар</h2>
      <p className="mt-2 text-muted-foreground">
        Подготовьте вопросы для проверки видимости компании. Запросы остаются в браузере.
      </p>
      <form onSubmit={prepareQueries} className="mt-6 grid gap-4 rounded-2xl border border-border bg-card p-5 sm:grid-cols-2">
        {radarFields.map(({ name, label, limit }) => (
          <label key={name} className="block text-sm font-medium">
            {label}
            <input
              name={name}
              type={name === "website" ? "url" : "text"}
              minLength={2}
              maxLength={limit}
              required
              className="mt-1 w-full rounded-lg border border-border bg-background p-3"
            />
          </label>
        ))}
        <div className="sm:col-span-2">
          <button type="submit" className="rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground">
            Подготовить вопросы
          </button>
        </div>
        {error && <p role="alert" className="sm:col-span-2">{error}</p>}
        <div aria-live="polite" className="sm:col-span-2">
          {queries.length > 0 && (
            <>
              <h3 className="font-semibold">Вопросы для ручной проверки</h3>
              <ol className="mt-2 list-decimal space-y-2 ps-5 [overflow-wrap:anywhere]">
                {queries.map((query) => <li key={query}>{query}</li>)}
              </ol>
            </>
          )}
        </div>
      </form>
    </section>
  );
}

function LicensePreview() {
  return (
    <section id="licenses" aria-labelledby="licenses-title" className="mx-auto max-w-3xl px-5 py-12 sm:px-8">
      <h2 id="licenses-title" className="text-3xl font-bold">Лицензии Нейросотрудника</h2>
      <p className="mt-2 text-muted-foreground">
        Пример состава полного комплекта. У каждого модуля будет свой статус выдачи и срок обновлений.
      </p>
      <ul className="mt-6 divide-y divide-border rounded-2xl border border-border bg-card px-5">
        {(["base", ...addonCodes] as const).map((code) => (
          <li key={code} className="flex flex-wrap items-center justify-between gap-2 py-3">
            <span className="font-medium">{productNames[code]}</span>
            <span className="text-sm text-muted-foreground">Демо · ожидает выдачи</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
