import assert from "node:assert/strict";
import { it } from "node:test";
import { buildRadarReport } from "../src/lib/profi-radar-report";
import { radarAuditQueries } from "../src/lib/ai-radar";

const brief = { business: "Дом Окон", website: "https://example.test", city: "Курган", category: "монтаж окон" };
const questions = radarAuditQueries(brief);

it("считает только последние наблюдения и отделяет упоминания от ссылок", () => {
  const seen = buildRadarReport(brief, [
    { engine: "Система A", query: questions[0].query, observedAt: "2026-11-26T10:00:00Z",
      answer: "Дом Окон", sources: ["https://example.test/old"] },
    { engine: "Система A", query: questions[0].query, observedAt: "2026-11-27T10:00:00Z",
      answer: "Рассмотрите компанию Окна Север.", sources: ["https://example.test/new"] },
    { engine: "Система B", query: questions[7].query, observedAt: "2026-11-27T11:00:00Z",
      answer: "ДОМ ОКОН работает с окнами.", sources: ["https://independent.test/article"] },
  ], ["Окна Север"]);
  assert.equal(seen.observations.length, 2);
  assert.equal(seen.observations[0].kind, "market");
  assert.equal(seen.observations[0].brandMention, false);
  assert.equal(seen.observations[0].siteLinked, true);
  assert.deepEqual(seen.observations[0].competitorMentions, ["Окна Север"]);
  assert.equal(seen.observations[1].kind, "brand");
  assert.equal(seen.observations[1].brandMention, true);
  assert.equal(seen.observations[1].siteLinked, false);
  assert.equal(seen.engines[0].observed, 1);
  assert.equal(seen.engines[0].expected, 12);
});

it("отклоняет наблюдения по чужому запросу и ссылки вне HTTP/HTTPS", () => {
  const evidence = { engine: "Система A", query: "Чужой вопрос", observedAt: "2026-11-27T10:00:00Z", answer: "", sources: [] };
  assert.throws(() => buildRadarReport(brief, [evidence], []));
  assert.throws(() => buildRadarReport(brief, [{ ...evidence, query: questions[0].query, sources: ["file:///tmp/example"] }], []));
});
