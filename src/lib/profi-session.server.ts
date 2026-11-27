import { createHash, randomBytes } from "node:crypto";

const cookiePrefix = "__Host-profi_session=";
const cookieAttributes = "Path=/; Secure; HttpOnly; SameSite=Lax";
const sessionSeconds = 86400;
type SessionQuery = (
  sql: string,
  parameters: [string],
) => Promise<{ rows: { auth_subject: string }[] }>;

function sessionHash(request: Request) {
  const cookies = request.headers.get("cookie")?.split(";") ?? [];
  const sessions = cookies.map((cookie) => cookie.trim()).filter((cookie) =>
    cookie.startsWith(cookiePrefix)
  );
  if (sessions.length !== 1) return null;
  const token = sessions[0].slice(cookiePrefix.length);
  return /^[A-Za-z0-9_-]{43}$/.test(token)
    ? createHash("sha256").update(token).digest("hex")
    : null;
}

export function createSessionVerifier(query: SessionQuery) {
  return async (request: Request) => {
    const hash = sessionHash(request);
    if (!hash) return null;
    const { rows } = await query(
      `SELECT customers.auth_subject
        FROM profi_market.sessions
        JOIN profi_market.customers ON customers.id = sessions.customer_id
        WHERE token_hash = $1 AND expires_at > now() AND revoked_at IS NULL`,
      [hash],
    );
    return rows[0] ? { subject: rows[0].auth_subject } : null;
  };
}

type SessionInsert = (
  sql: string,
  parameters: [string, string, number],
) => Promise<{ rows: { token_hash: string }[] }>;

export function createSessionIssuer(insert: SessionInsert) {
  return async (verifiedSubject: string) => {
    if (!verifiedSubject.trim()) return null;
    const token = randomBytes(32).toString("base64url");
    const hash = createHash("sha256").update(token).digest("hex");
    const { rows } = await insert(
      `INSERT INTO profi_market.sessions (token_hash, customer_id, expires_at)
       SELECT $1, id, now() + $3::integer * interval '1 second'
       FROM profi_market.customers WHERE auth_subject = $2 RETURNING token_hash`,
      [hash, verifiedSubject, sessionSeconds],
    );
    return rows[0] ? `${cookiePrefix}${token}; Max-Age=${sessionSeconds}; ${cookieAttributes}` : null;
  };
}

export function createSessionRevoker(update: (sql: string, parameters: [string]) => Promise<unknown>) {
  return async (request: Request) => {
    const hash = sessionHash(request);
    if (hash) {
      await update(
        "UPDATE profi_market.sessions SET revoked_at = now() WHERE token_hash = $1 AND revoked_at IS NULL",
        [hash],
      );
    }
    return `${cookiePrefix}; Max-Age=0; ${cookieAttributes}`;
  };
}
