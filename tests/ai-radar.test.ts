import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { observation, radarAuditQueries, radarQueries } from "../src/lib/ai-radar";

const brief = {
  business: "Окна Пример",
  website: "https://example.com/windows",
  city: "Курган",
  category: "установка окон",
};

describe("запросы и наблюдения AI-Радара", () => {
  it("сохраняет четыре стартовых вопроса и строит отдельный полный набор", () => {
    assert.equal(radarQueries(brief).length, 4);
    const questions = radarAuditQueries(brief);
    assert.ok(questions.length >= 10 && questions.length <= 15);
    assert.equal(new Set(questions.map(({ query }) => query)).size, questions.length);
    assert.ok(questions.some(({ kind, query }) => kind === "brand" && query.includes(brief.business)));
    assert.ok(questions.some(({ kind, query }) => kind === "market" && query.includes(brief.city)));
  });

  it("формирует вопросы, которые можно сохранить в отчёте даже при длинной анкете", () => {
    const questions = radarAuditQueries({
      ...brief,
      business: "А".repeat(160),
      city: "Б".repeat(160),
      category: "В".repeat(300),
    });
    for (const { query } of questions) {
      assert.equal(observation.safeParse({
        engine: "Тестовая система",
        query,
        observedAt: "2026-11-26T10:00:00Z",
        answer: "",
        sources: [],
      }).success, true);
    }
  });
});
