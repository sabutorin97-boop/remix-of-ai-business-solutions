import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";

const issuer = "https://oauth.telegram.org";
const flowCookie = "__Host-profi_telegram_flow=";
const attributes = "Path=/; Secure; HttpOnly; SameSite=Lax";
const random = () => randomBytes(32).toString("base64url");

type LoginOptions = {
  clientId: string;
  callback: string;
  exchange(code: string, verifier: string, nonce: string): Promise<string>;
  issue(subject: string): Promise<string | null>;
};

export function createTelegramLogin({ clientId, callback, exchange, issue }: LoginOptions) {
  return {
    start() {
      const state = random();
      const verifier = random();
      const nonce = random();
      const authorization = new URL(issuer + "/auth");
      authorization.search = new URLSearchParams({
        client_id: clientId, redirect_uri: callback, response_type: "code",
        scope: "openid", state, nonce, code_challenge_method: "S256",
        code_challenge: createHash("sha256").update(verifier).digest("base64url"),
      }).toString();
      return new Response(null, { status: 303, headers: {
        Location: authorization.href, "Cache-Control": "no-store",
        "Set-Cookie": `${flowCookie}${state}.${verifier}.${nonce}; Max-Age=600; ${attributes}`,
      } });
    },
    async complete(request: Request) {
      const headers = new Headers({
        "Cache-Control": "no-store",
        "Set-Cookie": `${flowCookie}; Max-Age=0; ${attributes}`,
      });
      const query = new URL(request.url).searchParams;
      const codes = query.getAll("code");
      const states = query.getAll("state");
      const cookies = (request.headers.get("cookie") ?? "").split(";").map((v) => v.trim())
        .filter((v) => v.startsWith(flowCookie));
      const flow = cookies.length === 1
        ? /^([\w-]{43})\.([\w-]{43})\.([\w-]{43})$/.exec(cookies[0].slice(flowCookie.length))
        : null;
      if (!flow || codes.length !== 1 || !codes[0] || codes[0].length > 2048 || states.length !== 1
        || !/^[\w-]{43}$/.test(states[0]) || !timingSafeEqual(Buffer.from(flow[1]), Buffer.from(states[0]))) {
        return new Response("Вход не подтверждён. Начните заново.", { status: 400, headers });
      }
      try {
        const subject = await exchange(codes[0], flow[2], flow[3]);
        const cookie = await issue(subject);
        if (!cookie) return new Response("Учётная запись покупателя не найдена.", { status: 403, headers });
        headers.append("Set-Cookie", cookie);
        headers.set("Location", "/shop");
        return new Response(null, { status: 303, headers });
      } catch {
        return new Response("Не удалось завершить вход.", { status: 502, headers });
      }
    },
  };
}

const telegramKeys = createRemoteJWKSet(new URL(issuer + "/.well-known/jwks.json"));

export async function verifyTelegramIdentity(
  token: string, clientId: string, nonce: string, keys: JWTVerifyGetKey = telegramKeys,
) {
  const { payload } = await jwtVerify(token, keys, {
    issuer, audience: clientId, algorithms: ["RS256", "ES256", "EdDSA"],
    requiredClaims: ["sub", "exp", "iat", "nonce"], maxTokenAge: "10m",
  });
  if (payload.nonce !== nonce || !payload.sub || !/^\d{1,30}$/.test(payload.sub)) {
    throw new Error("Токен Telegram не соответствует запросу");
  }
  return "telegram:" + payload.sub;
}

export function createTelegramExchange(clientId: string, secret: string, callback: string) {
  return async (code: string, verifier: string, nonce: string) => {
    const response = await fetch(issuer + "/token", {
      method: "POST", redirect: "error", signal: AbortSignal.timeout(8000),
      headers: {
        Authorization: "Basic " + Buffer.from(clientId + ":" + secret).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code", code, redirect_uri: callback, code_verifier: verifier,
      }),
    });
    if (!response.ok) throw new Error("Telegram отклонил обмен кода");
    const body = await response.json();
    if (typeof body?.id_token !== "string") throw new Error("Telegram не вернул токен");
    return verifyTelegramIdentity(body.id_token, clientId, nonce);
  };
}
