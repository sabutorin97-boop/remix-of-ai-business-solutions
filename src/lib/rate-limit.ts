// Простой in-memory rate-limit по IP (на инстанс воркера), вынесен из api/chat.ts
// для переиспользования в других серверных роутах.
const buckets = new Map<string, Map<string, { count: number; reset: number }>>();

export function rateLimit(
  scope: string,
  ip: string,
  { windowMs, max }: { windowMs: number; max: number },
): { ok: boolean; retryAfter?: number } {
  let bucket = buckets.get(scope);
  if (!bucket) {
    bucket = new Map();
    buckets.set(scope, bucket);
  }
  const now = Date.now();
  const entry = bucket.get(ip);
  if (!entry || entry.reset < now) {
    bucket.set(ip, { count: 1, reset: now + windowMs });
    return { ok: true };
  }
  if (entry.count >= max) {
    return { ok: false, retryAfter: Math.ceil((entry.reset - now) / 1000) };
  }
  entry.count += 1;
  return { ok: true };
}

export function getClientIp(request: Request): string {
  const h = request.headers;
  return (
    h.get("cf-connecting-ip") ||
    h.get("x-real-ip") ||
    (h.get("x-forwarded-for") || "").split(",")[0].trim() ||
    "unknown"
  );
}
