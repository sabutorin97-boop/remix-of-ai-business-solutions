import { useState, type FormEvent } from "react";
import { observation, radarAuditQueries, radarBrief, type RadarBrief } from "@/lib/ai-radar";
import { buildRadarReport } from "@/lib/profi-radar-report";
import type { z } from "zod";

type Observation = z.infer<typeof observation>;
const fieldClass = "mt-1 w-full rounded-lg border border-border bg-background p-2";

type RadarOrder = (input: { brief: RadarBrief; observations: Observation[]; competitors: string[] }) => void;

export function RadarObservationPreview({ brief, onOrder, busy }: {
  brief: RadarBrief; onOrder?: RadarOrder; busy?: boolean;
}) {
  const [entries, setEntries] = useState<Observation[]>([]);
  const [report, setReport] = useState<ReturnType<typeof buildRadarReport>>();
  const [error, setError] = useState("");
  const [competitors, setCompetitors] = useState<string[]>([]);

  function addObservation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    const value = (key: string) => String(fields.get(key) ?? "").trim();
    const date = new Date(value("date"));
    const result = observation.safeParse({
      engine: value("engine"),
      query: value("query"),
      observedAt: Number.isFinite(date.getTime()) ? date.toISOString() : "",
      answer: value("answer"),
      sources: value("sources").split(/\r?\n/).map((source) => source.trim()).filter(Boolean),
    });
    if (!result.success || entries.length >= 60) {
      setError("Проверь поля наблюдения. Допустимо до 60 записей.");
      return;
    }
    const next = [...entries, result.data];
    try {
      const competitors = value("competitors").split(/\r?\n/).map((name) => name.trim()).filter(Boolean);
      setReport(buildRadarReport(brief, next, competitors));
      setEntries(next);
      setCompetitors(competitors);
      setError("");
    } catch {
      setError("Проверь запрос, названия конкурентов и ссылки. Для отчёта допустимо до двух AI-систем.");
    }
  }

  return <section className="mt-6 rounded-2xl border border-border bg-card p-5" aria-labelledby="radar-evidence-title">
    <h3 id="radar-evidence-title" className="text-xl font-semibold">Сводка по наблюдениям</h3>
    <p className="mt-2 text-sm text-muted-foreground">{onOrder ? "Наблюдения сохранятся вместе с тестовым заказом." : "Перенеси полученные ответы вручную. Данные остаются в браузере."}</p>
    <form onSubmit={addObservation} className="mt-4 grid gap-3">
      <label>AI-система<input className={fieldClass} name="engine" required maxLength={100} /></label>
      <label>Запрос<select className={fieldClass} name="query" required>
        {radarAuditQueries(brief).map(({ query }) => <option key={query}>{query}</option>)}
      </select></label>
      <label>Дата и время наблюдения<input className={fieldClass} type="datetime-local" name="date" required /></label>
      <label>Ответ<textarea className={fieldClass} name="answer" maxLength={30000} /></label>
      <label>Ссылки из ответа, по одной на строку<textarea className={fieldClass} name="sources" maxLength={12000} /></label>
      <label>До трёх конкурентов, по одному на строку<textarea className={fieldClass} name="competitors" maxLength={500} /></label>
      <button type="submit" className="justify-self-start rounded-lg bg-primary px-4 py-2 text-primary-foreground">
        Добавить наблюдение
      </button>
      {error && <p role="alert">{error}</p>}
    </form>
    {report && <div className="mt-5 space-y-3" aria-live="polite">
      <p className="text-sm text-muted-foreground">{report.basis}</p>
      {onOrder && <button type="button" disabled={busy} className="rounded-lg border px-4 py-2"
        onClick={() => onOrder({ brief, observations: entries, competitors })}>Создать тестовый заказ с наблюдениями</button>}
      <ul className="space-y-2">
        {report.engines.map(({ engine, observed, expected }) =>
          <li key={engine}><strong>{engine}</strong> · {observed} из {expected} запросов</li>)}
      </ul>
      <ul className="space-y-3">
        {report.observations.map((item) =>
          <li key={JSON.stringify([item.engine, item.query])} className="break-words border-t pt-3 text-sm">
            <p className="font-medium">{item.kind === "brand" ? "Брендовый" : "Рыночный"} · {item.query}</p>
            <p>{item.engine} · {item.observedAt}</p>
            <p>Компания упомянута: {item.brandMention ? "да" : "нет"}. Сайт в источниках: {item.siteLinked ? "да" : "нет"}.</p>
            {item.competitorMentions.length > 0 && <p>Упомянуты конкуренты: {item.competitorMentions.join(", ")}.</p>}
            {item.sources.map((source) => <p key={source}>{source}</p>)}
          </li>)}
      </ul>
    </div>}
  </section>;
}

const radarFields = [
  { name: "business", label: "Компания", limit: 160 },
  { name: "website", label: "Сайт", limit: 500 },
  { name: "city", label: "Город", limit: 160 },
  { name: "category", label: "Товар или услуга", limit: 300 },
] as const;

export function RadarPreview({ onOrder, busy }: { onOrder?: RadarOrder; busy?: boolean } = {}) {
  const [queries, setQueries] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [reportBrief, setReportBrief] = useState<RadarBrief>();

  function prepareQueries(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    const result = radarBrief.safeParse(data);
    setQueries(result.success ? radarAuditQueries(result.data).map(({ query }) => query) : []);
    setReportBrief(result.success ? result.data : undefined);
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
      {reportBrief && <RadarObservationPreview key={JSON.stringify(reportBrief)} brief={reportBrief} onOrder={onOrder} busy={busy} />}
    </section>
  );
}
