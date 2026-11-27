import { createHash } from "node:crypto";

const cookiePrefix = "__Host-profi_session=";
type SessionQuery = (
  sql: string,
  parameters: [string],
) => Promise<{ rows: { auth_subject: string }[] }>;

export function createSessionVerifier(query: SessionQuery) {
  return async (request: Request) => {
    const cookies = request.headers.get("cookie")?.split(";") ?? [];
    const sessions = cookies.map((cookie) => cookie.trim()).filter((cookie) =>
      cookie.startsWith(cookiePrefix)
    );
    if (sessions.length !== 1) return null;
    const token = sessions[0].slice(cookiePrefix.length);
    if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return null;

    const hash = createHash("sha256").update(token).digest("hex");
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
