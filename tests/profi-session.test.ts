import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { it } from "node:test";
import { createSessionVerifier } from "../src/lib/profi-session.server";

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
