import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { reactiveReport } from "../src/lib/reactive-ai";

function report() {
  return {
    segments: ["Долго выбирают", "Отложили", "Ждут расчёт"],
    messages: Array.from({ length: 15 }, () => ({
      goal: "Возобновить диалог",
      channel: "Чат",
      text: "Подсказать, как сравнить варианты?",
      segment: "Долго выбирают",
    })),
    schedule: Array.from({ length: 14 }, (_, index) => ({
      day: index + 1,
      action: "Проверить статус и действовать только при согласии",
      stopCondition: "Остановиться при отказе",
    })),
    objections: Array.from({ length: 8 }, () => ({
      objection: "Дорого",
      answer: "Уточните, с каким предложением сравниваете.",
    })),
    offers: ["Повторить расчёт", "Сравнить варианты", "Ответить на вопросы"],
    metrics: ["Этап", "Ответ", "Дата"],
    nextSteps: ["Проверить согласие", "Выбрать сегмент", "Вычитать", "Отправить", "Зафиксировать ответ"],
  };
}

describe("проверка отчёта РеАктив AI", () => {
  it("принимает полный план с 14 разными днями", () => {
    assert.equal(reactiveReport.safeParse(report()).success, true);
  });

  it("отклоняет неполный план или повтор дня", () => {
    const missingDay = report();
    missingDay.schedule.pop();
    assert.equal(reactiveReport.safeParse(missingDay).success, false);

    const repeatedDay = report();
    repeatedDay.schedule[13].day = 1;
    assert.equal(reactiveReport.safeParse(repeatedDay).success, false);
  });

  it("отклоняет пустые и чрезмерно длинные сообщения", () => {
    const blank = report();
    blank.messages[0].text = "   ";
    assert.equal(reactiveReport.safeParse(blank).success, false);

    const oversized = report();
    oversized.messages[0].text = "а".repeat(5000);
    assert.equal(reactiveReport.safeParse(oversized).success, false);
  });

  it("отклоняет сообщение с неизвестным сегментом", () => {
    const unknown = report();
    unknown.messages[0].segment = "Не указан в отчёте";
    assert.equal(reactiveReport.safeParse(unknown).success, false);
  });
});
