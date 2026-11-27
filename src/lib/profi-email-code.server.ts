import { createHmac, randomInt, randomUUID } from "node:crypto";
import { z } from "zod";

const emailAddress = z.string().trim().toLowerCase().max(254).email();
const challengeId = z.string().uuid();

type EmailCodeDependencies = {
  secret: string;
  save(input: { email: string; id: string; digest: string }): Promise<boolean>;
  consume(id: string, digest: string): Promise<string | null>;
  send(email: string, code: string): Promise<void>;
  issue(subject: string): Promise<string | null>;
};

export function createEmailCodeService({ secret, save, consume, send, issue }: EmailCodeDependencies) {
  if (Buffer.byteLength(secret) < 32) throw new Error("Нужен отдельный ключ для кодов входа");
  const sign = (id: string, code: string) => createHmac("sha256", secret)
    .update(id + ":" + code).digest("hex");

  return {
    async requestCode(rawEmail: unknown) {
      const email = emailAddress.safeParse(rawEmail);
      if (!email.success) return null;
      const id = randomUUID();
      const code = String(randomInt(1000000)).padStart(6, "0");
      if (await save({ email: email.data, id, digest: sign(id, code) })) {
        await send(email.data, code);
      }
      return id;
    },
    async confirmCode(id: string, code: string) {
      if (!challengeId.safeParse(id).success || !/^\d{6}$/.test(code)) return null;
      const subject = await consume(id, sign(id, code));
      return subject ? issue(subject) : null;
    },
  };
}
