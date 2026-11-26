import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { verifyMoneclePaySignature } from "../src/lib/profi-monecle-pay.server";

const officialExample = {
  user_id: 123,
  buyer_email: "john@doe.com",
  buyer_name: "John Doe",
  buyer_phone: "+7 999 999 99 99",
  good_name: "Item 1",
  good_price: 99,
  installment: 1,
  success_url: "https://my-site.ru/pay/success",
  fail_url: "https://my-site.ru/pay/fail",
  callback_url: "https://my-site.ru/pay",
  external_good_id: "external_good_id-1",
  signature: "68bfb4a64f54583238363d7193b472fb13e6e6bcfe5275b2d9ebc77fe5c92f77",
};

describe("подпись MoneclePay", () => {
  it("совпадает с опубликованным примером независимо от порядка полей", () => {
    assert.equal(verifyMoneclePaySignature(officialExample, "secret"), true);
  });

  it("отклоняет изменённые данные, неверный ключ и отсутствующую подпись", () => {
    assert.equal(verifyMoneclePaySignature({ ...officialExample, good_price: 1 }, "secret"), false);
    assert.equal(verifyMoneclePaySignature(officialExample, "другой ключ"), false);
    assert.equal(verifyMoneclePaySignature({ ...officialExample, signature: null }, "secret"), false);
  });

  it("отклоняет неподдерживаемые значения и пустой ключ", () => {
    assert.equal(verifyMoneclePaySignature({ ...officialExample, buyer_name: [] }, "secret"), false);
    assert.equal(verifyMoneclePaySignature(officialExample, ""), false);
    assert.equal(verifyMoneclePaySignature(null, "secret"), false);
  });
});
