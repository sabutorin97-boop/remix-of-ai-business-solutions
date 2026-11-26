// Pure pricing policy. All money is integer kopecks; percentages are basis points.
// No rewards are issued here; server must persist and settle them transactionally.
export type RewardInput = {
  paid: number; production: number; paymentFee: number; taxReserve: number;
  otherCosts: number; requestedBonusBps: number; requestedPartnerBps: number;
};
export const loyaltyTiers = [
  { name: "Start", threshold: 0, bps: 200 },
  { name: "Silver", threshold: 1000000, bps: 300 },
  { name: "Gold", threshold: 2000000, bps: 500 },
  { name: "Platinum", threshold: 5000000, bps: 700 },
  { name: "VIP", threshold: 10000000, bps: 1000 },
] as const;
export function loyaltyTier(lifetimePaid: number) {
  if (!Number.isSafeInteger(lifetimePaid) || lifetimePaid < 0) throw new Error("Invalid lifetime paid");
  return [...loyaltyTiers].reverse().find(t => lifetimePaid >= t.threshold) ?? loyaltyTiers[0];
}
export function rewardBudget(input: RewardInput) {
  for (const [key, value] of Object.entries(input)) {
    if (!Number.isSafeInteger(value) || value < 0 || (key.endsWith("Bps") && value > 10000)) throw new Error("Invalid " + key);
  }
  const { paid, production, paymentFee, taxReserve, otherCosts, requestedBonusBps, requestedPartnerBps } = input;
  const baseline = production + paymentFee + taxReserve + otherCosts;
  const ceiling = Math.floor(paid / 4);
  const available = Math.max(0, ceiling - baseline);
  // Existing advertised rewards must not be silently reduced after checkout.
  const bonus = Math.floor(paid * requestedBonusBps / 10000);
  const partner = Math.floor(paid * requestedPartnerBps / 10000);
  const total = baseline + bonus + partner;
  return { baseline, ceiling, available, bonus, partner, total, eligible: paid > 0 && total <= ceiling };
}
export const microProducts = [
  { sku: "reactive-ai", name: "РеАктив AI", price: 249000, status: "planned" },
  { sku: "ai-radar", name: "AI-Радар", price: 299000, status: "planned" },
  { sku: "employee-lite", name: "Нейросотрудник Lite", price: 199000, status: "planned" },
  { sku: "content-factory", name: "Контент-фабрика", price: 199000, status: "planned" },
  { sku: "product48", name: "Инфопродукт 48", price: 299000, status: "planned" },
] as const;
