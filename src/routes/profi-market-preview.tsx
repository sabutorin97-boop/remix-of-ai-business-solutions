import { createFileRoute, notFound } from "@tanstack/react-router";
import { ProfiAccountPreview } from "@/components/site/ProfiAccountPreview";
import { ProfiAdminPreview } from "@/components/site/ProfiAdminPreview";
import { ReactiveBriefPreview } from "@/components/site/ReactiveBriefPreview";
import { RadarPreview } from "@/components/site/RadarObservationPreview";
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
