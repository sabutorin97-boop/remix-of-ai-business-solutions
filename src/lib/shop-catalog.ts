export const packagePrices = { base: 9900, photo: 4900, video: 6900, design: 3900, dev: 5900, all: 24900, updates: 1490 } as const;
export const addonCodes = ["photo", "video", "design", "dev"] as const;

export type PackageCode = (typeof addonCodes)[number];
export type Mode = "custom" | "all" | "addons" | "updates";

export const productNames = {
  base: "Базовый",
  photo: "Фото-студия",
  video: "Видео + Звук",
  design: "Дизайн",
  dev: "Разработка",
  all: "Всё включено",
  updates: "Обновления на месяц",
} as const;

export const money = (price: number) => price.toLocaleString("ru-RU") + " ₽";
export const bundleSavings = packagePrices.base + addonCodes.reduce((sum, code) => sum + packagePrices[code], 0) - packagePrices.all;

export function shopOrder(mode: Mode, selected: readonly PackageCode[]) {
  const addons = addonCodes.filter((code) => selected.includes(code));
  const codes = mode === "all" || mode === "updates" ? [mode] as const :
    mode === "addons" ? addons : ["base", ...addons] as const;
  const rows = codes.map((code) => ({ name: productNames[code], price: packagePrices[code] }));
  const total = rows.reduce((sum, row) => sum + row.price, 0);
  const sku = codes.join(",");
  const checkout = rows.length ? "https://t.me/sabutorin45?text=" + encodeURIComponent([
    "Здравствуйте! Хочу оформить заказ в магазине «Нейросотрудник».",
    "",
    ...rows.map(({ name, price }) => name + " — " + money(price)),
    "Итого — " + money(total),
    "Код комплектации — " + sku,
    "",
    "Подскажите, как оплатить и получить доступ?",
  ].join("\n")) : null;
  return { rows, total, sku, checkout };
}
