import { addonCodes } from "./shop-catalog";

const supportedModules = ["base", ...addonCodes] as const;
export type LicenseModule = (typeof supportedModules)[number];

export interface LicenseAccessAdapter {
  listManagedModules(verifiedAccount: string): Promise<readonly LicenseModule[]>;
  grant(verifiedAccount: string, module: LicenseModule): Promise<void>;
  revoke(verifiedAccount: string, module: LicenseModule): Promise<void>;
}

/** Сравнивает купленные права только с доступами, которыми управляет Profi License. */
export function planLicenseChanges(
  activePurchaseSkus: readonly string[],
  managedModules: readonly LicenseModule[],
) {
  const purchased = new Set(activePurchaseSkus);
  const assigned = new Set(managedModules);
  const desired = new Set<LicenseModule>();
  if (purchased.has("all")) {
    for (const module of supportedModules) desired.add(module);
  } else if (purchased.has("base")) {
    for (const module of supportedModules) {
      if (purchased.has(module)) desired.add(module);
    }
  }

  return {
    grant: supportedModules.filter((module) => desired.has(module) && !assigned.has(module)),
    revoke: supportedModules.filter((module) => assigned.has(module) && !desired.has(module)),
  };
}

/** Сверяет один подтверждённый аккаунт. При повторе читает фактическое состояние адаптера. */
export async function reconcileLicenseAssignments(
  verifiedAccount: string,
  activePurchaseSkus: readonly string[],
  adapter: LicenseAccessAdapter,
) {
  const managed = await adapter.listManagedModules(verifiedAccount);
  const changes = planLicenseChanges(activePurchaseSkus, managed);

  for (const module of changes.revoke) await adapter.revoke(verifiedAccount, module);
  for (const module of changes.grant) await adapter.grant(verifiedAccount, module);
  return changes;
}
