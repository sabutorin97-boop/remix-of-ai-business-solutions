import { packagePrices, addonCodes, productNames } from "./shop-catalog";
import { microProducts } from "./profi-market-policy";

export type OrderLine = { sku: string; name: string; unitMinor: number };
export type PaymentProvider = "monecle" | "manual" | "lava";

// Always recompute from the trusted catalog, never from a client total.
export function quoteOrder(skus: readonly string[], activeMicroSkus: ReadonlySet<string> = new Set()): { lines: OrderLine[]; grossMinor: number } {
  if (!Array.isArray(skus) || skus.length < 1 || skus.length > 6 || new Set(skus).size !== skus.length) throw new Error("Invalid cart");
  if ((skus.includes("all") || skus.includes("updates")) && skus.length !== 1) throw new Error("Exclusive package");
  const lines = skus.map(sku => {
    if (Object.prototype.hasOwnProperty.call(packagePrices, sku)) {
      const key = sku as keyof typeof packagePrices;
      return {sku, name: productNames[key], unitMinor: packagePrices[key] * 100};
    }
    const micro = microProducts.find(p => p.sku === sku);
    if (!micro || !activeMicroSkus.has(sku)) throw new Error("Product unavailable");
    return {sku, name: micro.name, unitMinor: micro.price};
  });
  if (lines.some(l => addonCodes.some(code => code === l.sku)) && lines.some(l => microProducts.some(p => p.sku === l.sku))) throw new Error("Separate orders required");
  return {lines, grossMinor: lines.reduce((sum,l) => sum+l.unitMinor,0)};
}

export function validReferralCode(value: unknown): string | null {
  return typeof value === "string" && /^[A-Za-z0-9_-]{8,64}$/.test(value) ? value : null;
}
export function referralEligible(input: {buyerId: string; partnerCustomerId: string; active: boolean; expiresAt: number; now: number}) {
  return input.active && Boolean(input.buyerId) && Boolean(input.partnerCustomerId) && input.buyerId !== input.partnerCustomerId && Number.isFinite(input.expiresAt) && Number.isFinite(input.now) && input.now < input.expiresAt;
}
export function bonusDiscount(grossMinor: number, availableMinor: number, requestedMinor: number, capBps: number) {
  if (![grossMinor, availableMinor, requestedMinor, capBps].every(n => Number.isSafeInteger(n) && n >= 0) || grossMinor < 1 || capBps > 1500) throw new Error("Invalid discount");
  return Math.min(availableMinor, requestedMinor, Math.floor(grossMinor * capBps / 10000));
}
export const rewardHoldMs = 14 * 24 * 60 * 60 * 1000;
export const referralWindowMs = 30 * 24 * 60 * 60 * 1000;
export const bonusLifetimeMs = 180 * 24 * 60 * 60 * 1000;
