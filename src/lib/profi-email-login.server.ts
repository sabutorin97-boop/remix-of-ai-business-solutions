import { z } from "zod";
import { isProfiJson, readProfiJson } from "./profi-json.server";

const emailInput = z.object({ email: z.string().trim().toLowerCase().max(254).email() }).strict();
const codeInput = z.object({ code: z.string().regex(/^\d{6}$/) }).strict();
const challengeId = z.string().uuid();
const prefix = "__Host-profi_email_challenge=";
const attributes = "Path=/; HttpOnly; Secure; SameSite=Strict";

type Options = {
  origin: string;
  requestCode(email: string): Promise<string | null>;
  confirmCode(id: string, code: string): Promise<string | null>;
};

export function createEmailLoginHandler(options: Options) {
  const origin = new URL(options.origin).origin;
  return async (request: Request, step: "request" | "confirm") => {
    const headers = new Headers({ "Cache-Control": "no-store" });
    const reply = (status: number, body: object) => Response.json(body, { status, headers });
    if (request.method !== "POST") return reply(405, { error: "method_not_allowed" });
    if (request.headers.get("origin") !== origin) return reply(403, { error: "invalid_origin" });
    if (!isProfiJson(request)) return reply(415, { error: "unsupported_media_type" });
    try {
      const body = await readProfiJson(request);
      if ("error" in body) return reply(body.error, { error: "invalid_input" });
      if (step === "request") {
        const input = emailInput.safeParse(body.value);
        if (!input.success) return reply(400, { error: "invalid_input" });
        const id = await options.requestCode(input.data.email);
        if (!id) return reply(400, { error: "invalid_input" });
        headers.append("Set-Cookie", `${prefix}${id}; Max-Age=600; ${attributes}`);
        return reply(202, { accepted: true });
      }
      const input = codeInput.safeParse(body.value);
      const cookies = (request.headers.get("cookie") ?? "").split(";").map((value) => value.trim())
        .filter((value) => value.startsWith(prefix));
      const id = challengeId.safeParse(cookies.length === 1 ? cookies[0].slice(prefix.length) : "");
      if (!input.success || !id.success) return reply(400, { error: "invalid_input" });
      const session = await options.confirmCode(id.data, input.data.code);
      if (!session) return reply(401, { error: "invalid_or_expired_code" });
      headers.append("Set-Cookie", `${prefix}; Max-Age=0; ${attributes}`);
      headers.append("Set-Cookie", session);
      return reply(200, { authenticated: true });
    } catch {
      return reply(503, { error: "email_login_unavailable" });
    }
  };
}
