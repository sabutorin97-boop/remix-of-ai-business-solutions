import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { it } from "node:test";
import { createSessionIssuer, createSessionRevoker, createSessionVerifier } from "../src/lib/profi-session.server";

const token = Buffer.alloc(32, 17).toString("base64url");
const cookieName = "__Host-profi_session";
const request = (cookie: string) => new Request("https://shop.example.test", {
  headers: { cookie },
});

it("проверяет сессию по хешу токена, без передачи токена в базу", async () => {
  const verify = createSessionVerifier(async (statement, parameters) => {
    assert.match(statement, /expires_at > now\(\)/);
    assert.match(statement, /revoked_at IS NULL/);
    assert.deepEqual(parameters, [createHash("sha256").update(token).digest("hex")]);
    return { rows: [{ auth_subject: "known-buyer" }] };
  });
  assert.deepEqual(await verify(request(`other=123; ${cookieName}=${token}`)), { subject: "known-buyer" });
});

it("отклоняет отсутствующий, повреждённый и неоднозначный cookie", async () => {
  const verify = createSessionVerifier(async () => assert.fail("Проверка в БД не требуется"));
  for (const header of ["other=123", `${cookieName}=bad`, `${cookieName}=${token}; ${cookieName}=${token}`]) {
    assert.equal(await verify(request(header)), null);
  }
});

it("отклоняет токен без действующей записи сессии", async () => {
  const verify = createSessionVerifier(async () => ({ rows: [] }));
  assert.equal(await verify(request(`${cookieName}=${token}`)), null);
});

it("выпускает защищённый cookie только после сохранения хеша для известного покупателя", async () => {
  let stored: string | undefined;
  const issue = createSessionIssuer(async (statement, [hash, subject, seconds]) => {
    assert.match(statement, /INSERT INTO profi_market.sessions/);
    assert.equal(subject, "known-buyer");
    assert.equal(seconds, 86400);
    stored = hash;
    return { rows: [{ token_hash: hash }] };
  });
  const cookie = await issue("known-buyer");
  assert.ok(cookie);
  const match = /^__Host-profi_session=([A-Za-z0-9_-]{43}); Max-Age=86400; Path=\/; Secure; HttpOnly; SameSite=Lax$/.exec(cookie);
  assert.ok(match);
  assert.equal(createHash("sha256").update(match[1]).digest("hex"), stored);
  assert.equal(await createSessionIssuer(async () => ({ rows: [] }))("unknown-buyer"), null);
});

it("при выходе отзывает только текущую сессию и очищает cookie", async () => {
  const logout = createSessionRevoker(async (statement, [hash]) => {
    assert.match(statement, /UPDATE profi_market.sessions SET revoked_at = now\(\)/);
    assert.equal(hash, createHash("sha256").update(token).digest("hex"));
  });
  assert.match(await logout(request(`${cookieName}=${token}`)), /^__Host-profi_session=; Max-Age=0;/);
});
