import { z } from "zod";
import { radarAuditQueries, radarEvidence } from "./ai-radar";

function normalizedWords(text: string) {
  return text.normalize("NFKC").toLocaleLowerCase("ru")
    .replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

function observedUrl(raw: string) {
  const url = new URL(raw);
  if ((url.protocol !== "https:" && url.protocol !== "http:") || url.username || url.password) {
    throw new Error("Допустимы только источники HTTP и HTTPS без учётных данных.");
  }
  return url;
}

function host(url: URL) {
  return url.hostname.toLowerCase().replace(/^www\./, "");
}

export function buildRadarReport(rawBrief: unknown, rawObservations: unknown, rawCompetitors: unknown) {
  const { brief, observations } = radarEvidence(rawBrief, rawObservations);
  const competitors = z.array(z.string().trim().min(2).max(160)).max(3).parse(rawCompetitors);
  const names = [brief.business, ...competitors].map(normalizedWords);
  if (names.some((name) => !name) || new Set(names).size !== names.length) {
    throw new Error("Компания и конкуренты должны иметь разные названия.");
  }
  const companyHost = host(observedUrl(brief.website));
  const questions = radarAuditQueries(brief);
  const queryKinds = new Map<string, "brand" | "market">(questions.map(({ query, kind }) => [query, kind]));
  const latest = new Map<string, typeof observations[number]>();
  for (const item of observations) {
    const engine = item.engine.trim();
    if (!engine || !queryKinds.has(item.query)) throw new Error("Наблюдение не соответствует вопросам аудита.");
    const sources = item.sources.map((source) => observedUrl(source).href);
    const key = JSON.stringify([engine.toLocaleLowerCase("ru"), item.query]);
    const previous = latest.get(key);
    if (!previous || Date.parse(item.observedAt) > Date.parse(previous.observedAt)) {
      latest.set(key, { ...item, engine, sources: Array.from(new Set(sources)) });
    }
  }

  const summarized = Array.from(latest.values()).map((item) => {
    const words = " " + normalizedWords(item.answer) + " ";
    // Подсчёт фиксирует точное текстовое упоминание, независимо от наличия ссылки.
    const containsName = (name: string) => words.includes(" " + normalizedWords(name) + " ");
    return {
      ...item,
      kind: queryKinds.get(item.query)!,
      brandMention: containsName(brief.business),
      siteLinked: item.sources.some((source) => host(new URL(source)) === companyHost),
      competitorMentions: competitors.filter(containsName),
    };
  });
  const byEngine = new Map<string, { engine: string; observed: number; expected: number }>();
  for (const { engine } of summarized) {
    const key = engine.toLocaleLowerCase("ru");
    const row = byEngine.get(key) ?? { engine, observed: 0, expected: questions.length };
    row.observed++;
    byEngine.set(key, row);
  }
  if (byEngine.size > 2) throw new Error("Для одного отчёта выберите до двух AI-систем.");

  return {
    brief,
    observations: summarized,
    engines: Array.from(byEngine.values()),
    basis: "Наблюдения внесены вручную. Подсчёт показывает точные упоминания и ссылки в собранной выборке.",
  };
}
