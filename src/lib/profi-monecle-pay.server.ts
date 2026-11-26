import { createHmac } from "node:crypto";
import { safeSignatureEqual } from "./profi-payment-contract.server";

/** Проверяет только HMAC. Подтверждение оплаты требует отдельной сверки с заказом. */
export function verifyMoneclePaySignature(payload: unknown, key: string): boolean {
  if (!key || !payload || typeof payload !== "object" || Array.isArray(payload)) return false;

  const fields = payload as Record<string, unknown>;
  const { signature } = fields;
  if (typeof signature !== "string" || !/^[a-f0-9]{64}$/.test(signature)) return false;

  const names = Object.keys(fields).filter((name) => name !== "signature").sort();
  if (names.length === 0) return false;
  const values: string[] = [];
  for (const name of names) {
    const value = fields[name];
    if (value === null || value === false) values.push("");
    else if (value === true) values.push("1");
    else if (typeof value === "string") values.push(value);
    else if (typeof value === "number" && Number.isFinite(value)) values.push(String(value));
    else return false;
  }

  const calculated = createHmac("sha256", key).update(values.join(";"), "utf8").digest("hex");
  return safeSignatureEqual(calculated, signature);
}
