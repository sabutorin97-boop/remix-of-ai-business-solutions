import assert from "node:assert/strict";
import { it } from "node:test";
import { createEmailLoginHandler } from "../src/lib/profi-email-login.server";

const origin = "https://shop.example.test";
const challenge = "801d2ebf-f673-48ba-9f9e-b51fa9710a19";
const request = (body: unknown, from = origin, cookie?: string) => new Request(origin, {
  method: "POST",
  headers: { origin: from, "content-type": "application/json", ...(cookie ? { cookie } : {}) },
  body: JSON.stringify(body),
});

it("связывает код с защищённым cookie браузера и выдаёт сессию после проверки", async () => {
  const handler = createEmailLoginHandler({
    origin, async requestCode(email) {
      assert.equal(email, "buyer@example.test");
      return challenge;
    },
    async confirmCode(id, code) {
      assert.equal(id, challenge);
      return code === "123456" ? "__Host-profi_session=fixture" : null;
    },
  });
  const issued = await handler(request({ email: "buyer@example.test" }), "request");
  assert.equal(issued.status, 202);
  const setCookie = issued.headers.get("set-cookie")!;
  assert.match(setCookie, /HttpOnly; Secure; SameSite=Strict/);
  assert.equal((await handler(request({ code: "123456" }), "confirm")).status, 400);
  const cookie = setCookie.split(";")[0];
  assert.equal((await handler(request({ code: "654321" }, origin, cookie), "confirm")).status, 401);
  const success = await handler(request({ code: "123456" }, origin, cookie), "confirm");
  assert.equal(success.status, 200);
  assert.match(success.headers.get("set-cookie")!, /__Host-profi_session=fixture/);
  assert.match(success.headers.get("set-cookie")!, /Max-Age=0/);
});

it("отклоняет чужой Origin, подставленный идентификатор и слишком большое тело", async () => {
  const handler = createEmailLoginHandler({
    origin,
    requestCode: async () => assert.fail("Нельзя запрашивать код"),
    confirmCode: async () => assert.fail("Нельзя подтверждать код"),
  });
  assert.equal((await handler(request({ email: "buyer@example.test" }, "https://other.test"), "request")).status, 403);
  assert.equal((await handler(request({ code: "123456", challenge }), "confirm")).status, 400);
  assert.equal((await handler(request({ email: "a".repeat(6000) }), "request")).status, 413);
});
