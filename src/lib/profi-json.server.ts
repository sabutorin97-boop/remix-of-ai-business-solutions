export function isProfiJson(request: Request) {
  return request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() === "application/json";
}

export async function readProfiJson(request: Request): Promise<
  { value: unknown } | { error: 400 | 413 }
> {
  const reader = request.body?.getReader();
  if (!reader) return { error: 400 };
  const buffer = new Uint8Array(4096);
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (length + value.length > buffer.length) {
        void reader.cancel().catch(() => {});
        return { error: 413 };
      }
      buffer.set(value, length);
      length += value.length;
    }
  } finally {
    reader.releaseLock();
  }
  try {
    return { value: JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(buffer.subarray(0, length))) };
  } catch {
    return { error: 400 };
  }
}
