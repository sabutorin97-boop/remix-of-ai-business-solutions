import assert from "node:assert/strict";
import { it } from "node:test";
import { generateKeyPair, SignJWT } from "jose";
import { createTelegramLogin, verifyTelegramIdentity } from "../src/lib/profi-telegram-login.server";

it("связывает начало и завершение входа с браузером и выдаёт сессию только подтверждённому покупателю", async () => {
  const origin = "https://shop.example.test";
  const callback = origin + "/api/profi-login/telegram/callback";
  let calls = 0;
  const login = createTelegramLogin({
    clientId: "123",
    callback,
    async exchange(code, verifier, nonce) {
      calls++;
      assert.equal(code, "code-from-provider");
      assert.match(verifier, /^[A-Za-z0-9_-]{43}$/);
      assert.match(nonce, /^[A-Za-z0-9_-]{43}$/);
      return "telegram:12345";
    },
    async issue(subject) {
      assert.equal(subject, "telegram:12345");
      return "__Host-profi_session=test";
    },
  });
  const start = login.start();
  const url = new URL(start.headers.get("location")!);
  assert.equal(url.origin, "https://oauth.telegram.org");
  assert.equal(url.searchParams.get("code_challenge_method"), "S256");
  assert.equal(url.searchParams.get("scope"), "openid");
  const cookie = start.headers.get("set-cookie")!.split(";")[0];
  const done = (state: string) => login.complete(new Request(
    callback + "?code=code-from-provider&state=" + state, { headers: { cookie } },
  ));
  assert.equal((await done("invalid")).status, 400);
  assert.equal(calls, 0);
  const success = await done(url.searchParams.get("state")!);
  assert.equal(success.status, 303);
  assert.match(success.headers.get("set-cookie")!, /__Host-profi_session=test/);
});

it("проверяет подпись, получателя и nonce токена Telegram", async () => {
  const { publicKey, privateKey } = await generateKeyPair("ES256");
  const key = async () => publicKey;
  const token = await new SignJWT({ nonce: "expected-nonce" })
    .setProtectedHeader({ alg: "ES256" }).setIssuer("https://oauth.telegram.org")
    .setAudience("123").setSubject("456").setIssuedAt().setExpirationTime("2m").sign(privateKey);
  assert.equal(await verifyTelegramIdentity(token, "123", "expected-nonce", key), "telegram:456");
  await assert.rejects(verifyTelegramIdentity(token, "other", "expected-nonce", key));
  await assert.rejects(verifyTelegramIdentity(token, "123", "wrong", key));
  const otherKey = async () => (await generateKeyPair("ES256")).publicKey;
  await assert.rejects(verifyTelegramIdentity(token, "123", "expected-nonce", otherKey));
});
