import assert from "node:assert/strict";
import { it } from "node:test";
import { buildReactiveDemo, generateReactiveKit, reactiveKitText } from "../src/lib/reactive-kit";

const brief = {
  business: "Оконная компания", offer: "Монтаж окон", averageCheck: 42000,
  objections: "Клиенты откладывают решение", lastContact: "month", permittedOffer: "", tone: "professional",
};

it("собирает полный локальный образец с календарём, вариантами сообщений и условиями остановки", () => {
  const report = buildReactiveDemo(brief);
  assert.equal(report.messages.length, 15);
  assert.equal(new Set(report.messages.map(({ text }) => text)).size, 15);
  assert.deepEqual(report.schedule.map(({ day }) => day), Array.from({ length: 14 }, (_, i) => i + 1));
  assert.ok(report.schedule.every(({ stopCondition }) => /отказ/.test(stopCondition)));
  const text = reactiveKitText(report);
  assert.match(text, /РеАктив AI/);
  assert.match(text, /Монтаж окон/);
  assert.match(text, /не отправляй/);
});

it("принимает только структурированный результат и не вызывает генератор при неверной анкете", async () => {
  let calls = 0;
  const provider = async (input: { prompt: string }) => {
    calls++;
    assert.equal(JSON.parse(input.prompt).business, brief.business);
    return buildReactiveDemo(brief);
  };
  assert.ok((await generateReactiveKit(brief, provider)).segments.length);
  await assert.rejects(generateReactiveKit({ ...brief, business: "" }, provider));
  assert.equal(calls, 1);
  await assert.rejects(generateReactiveKit(brief, async () => ({ messages: [] })));
});
