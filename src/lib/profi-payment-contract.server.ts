import { timingSafeEqual } from "node:crypto";
export type ExpectedPayment = { orderId: string; amountMinor: number; currency: "RUB"; provider: "monecle" | "manual" | "lava" };
export type VerifiedPayment = ExpectedPayment & { eventId: string; externalId: string; status: "paid" | "refunded" };
// Provider-specific signature verification must run before constructing VerifiedPayment.
// Browser redirects, unsigned payloads and screenshots are never proof of payment.
export function matchVerifiedPayment(expected: ExpectedPayment, event: VerifiedPayment) {
  return Boolean(event.eventId && event.externalId) && Number.isSafeInteger(event.amountMinor) &&
    event.amountMinor > 0 && event.amountMinor === expected.amountMinor &&
    event.orderId === expected.orderId && event.currency === expected.currency && event.provider === expected.provider;
}
export function safeSignatureEqual(expected: string, supplied: string) {
  const a = Buffer.from(expected), b = Buffer.from(supplied);
  return a.length === b.length && timingSafeEqual(a,b);
}
export interface PaymentAdapter {
  createCheckout(order: ExpectedPayment): Promise<{url: string; externalId: string}>;
  verifyWebhook(raw: Uint8Array, headers: Headers): Promise<VerifiedPayment>;
}
// No live adapter until merchant credentials, official signature protocol and sandbox tests are verified.
export function onlinePaymentsEnabled() { return false; }
