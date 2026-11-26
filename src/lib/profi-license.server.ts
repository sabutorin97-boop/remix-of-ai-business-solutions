import { addonCodes } from "./shop-catalog";

const supportedModules = ["base", ...addonCodes] as const;
type LicenseModule = (typeof supportedModules)[number];

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
