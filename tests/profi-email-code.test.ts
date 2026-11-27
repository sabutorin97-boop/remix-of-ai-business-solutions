import assert from "node:assert/strict";
import { it } from "node:test";
import { createEmailCodeService, createPostgresEmailCodeStore } from "../src/lib/profi-email-code.server";

it("связывает отправленный код с запросом и выдаёт сессию по подтверждённому ответу хранилища", async () => {
  let challenge: { email: string; id: string; digest: string } | undefined;
  let message = "";
  const service = createEmailCodeService({
    secret: "test-secret-".repeat(4),
    async save(input) { challenge = input; return true; },
    async consume(id, digest) {
      if (challenge?.id !== id || challenge.digest !== digest) return null;
      challenge = undefined;
      return "known-buyer";
    },
    async send(email, code) { assert.equal(email, "buyer@example.test"); message = code; },
    async issue(subject) { assert.equal(subject, "known-buyer"); return "session-cookie"; },
  });
  const id = await service.requestCode(" Buyer@EXAMPLE.TEST ");
  assert.ok(id);
  assert.match(message, /^\d{6}$/);
  assert.notEqual(challenge?.digest, message);
  assert.equal(await service.confirmCode(id, "invalid"), null);
  assert.equal(await service.confirmCode(id, message), "session-cookie");
  assert.equal(await service.confirmCode(id, message), null);
});

it("передаёт значения в PostgreSQL отдельно от запроса и различает результат списания", async () => {
  const id = "801d2ebf-f673-48ba-9f9e-b51fa9710a19";
  const digest = "a".repeat(64);
  let calls = 0;
  const store = createPostgresEmailCodeStore(async (statement, values) => {
    calls++;
    if (calls === 1) {
      assert.match(statement, /save_email_code\(\$1, \$2, \$3\)/);
      assert.deepEqual(values, ["buyer@example.test", id, digest]);
      return [{ saved: true }];
    }
    assert.match(statement, /consume_email_code\(\$1, \$2\)/);
    assert.deepEqual(values, [id, digest]);
    return [{ subject: calls === 2 ? "known-buyer" : null }];
  });
  assert.equal(await store.save({ email: "buyer@example.test", id, digest }), true);
  assert.equal(await store.consume(id, digest), "known-buyer");
  assert.equal(await store.consume(id, digest), null);
});

it("отвечает одинаково для неизвестного адреса и не отправляет письмо", async () => {
  const service = createEmailCodeService({
    secret: "test-secret-".repeat(4),
    async save() { return false; },
    async consume() { return null; },
    async send() { assert.fail("Адрес не подтверждён"); },
    async issue() { assert.fail("Сессия не должна выпускаться"); },
  });
  assert.match((await service.requestCode("missing@example.test")) ?? "", /^[0-9a-f-]{36}$/);
});
