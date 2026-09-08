/**
 * Хранилище партнёров для Telegram-бота. Схема та же, что у `leads-store`:
 * один партнёр = один JSON-объект `partners/<telegramId>.json` в Timeweb S3,
 * плюс `partners/_index.json` для общего списка.
 *
 * Отличие от leads-store: бот обязан отвечать, даже когда S3 не настроен или
 * временно недоступен. Поэтому при отсутствии переменных S3_* и при любой
 * ошибке бакета данные уходят в память процесса — партнёр продолжает работать,
 * а ошибка попадает в лог. Память живёт до перезапуска инстанса, так что это
 * аварийный режим, а не штатный: без S3 прогресс обучения теряется при
 * рестарте.
 *
 * Сервер-only: здесь ключи доступа к бакету, в клиентский код не импортировать.
 */
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import type { LeadTemperature } from "@/lib/partner-training";

export type PendingAction =
  | {
      kind: "deal";
      step: "type" | "client" | "contact" | "note";
      draft: { temperature?: LeadTemperature; client?: string; contact?: string };
    }
  | { kind: "ask" }
  | { kind: "search" }
  | { kind: "access_code" };

/** Реплика диалога с AI-наставником: хранится, чтобы бот помнил контекст. */
export interface ChatTurn {
  role: "user" | "bot";
  text: string;
}

export interface PartnerDeal {
  /** id лида в leads-store; null, если S3 недоступен и лид не сохранился. */
  leadId: string | null;
  /**
   * Тип лида на момент передачи — от него зависит ставка комиссии.
   * Необязательный: у сделок, переданных до разделения ставок, его нет.
   */
  temperature?: LeadTemperature;
  clientName: string;
  contact: string;
  note: string | null;
  createdAt: string;
}

export interface Partner {
  telegramId: number;
  username: string | null;
  firstName: string | null;
  /** Метка партнёра в заявках и ссылках: по ней видно, кто привёл клиента. */
  refCode: string;
  status: "active" | "pending_code";
  createdAt: string;
  updatedAt: string;
  lastSeenAt: string;
  /** Номера пройденных уроков (1–8). */
  lessonsDone: number[];
  deals: PartnerDeal[];
  /** Последние реплики разговора с AI. Хранится немного и обрезается. */
  chat?: ChatTurn[];
  pending: PendingAction | null;
}

let cachedClient: S3Client | null = null;
const memory = new Map<number, Partner>();
let memoryWarned = false;

function s3Configured(): boolean {
  return Boolean(
    process.env.S3_ENDPOINT &&
    process.env.S3_REGION &&
    process.env.S3_BUCKET &&
    process.env.S3_ACCESS_KEY &&
    process.env.S3_SECRET_KEY,
  );
}

function client(): S3Client {
  if (cachedClient) return cachedClient;
  cachedClient = new S3Client({
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION,
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY as string,
      secretAccessKey: process.env.S3_SECRET_KEY as string,
    },
  });
  return cachedClient;
}

function warnMemoryOnce(reason: string): void {
  if (memoryWarned) return;
  memoryWarned = true;
  console.warn(
    `[partners-store] Работаем в памяти процесса: ${reason}. Прогресс партнёров не переживёт рестарт.`,
  );
}

async function putJson(key: string, value: unknown): Promise<void> {
  await client().send(
    new PutObjectCommand({
      Bucket: process.env.S3_BUCKET as string,
      Key: key,
      Body: JSON.stringify(value, null, 2),
      ContentType: "application/json",
    }),
  );
}

async function getJson<T>(key: string): Promise<T | null> {
  try {
    const res = await client().send(
      new GetObjectCommand({ Bucket: process.env.S3_BUCKET as string, Key: key }),
    );
    const text = await res.Body?.transformToString();
    return text ? (JSON.parse(text) as T) : null;
  } catch (err) {
    const e = err as { name?: string; $metadata?: { httpStatusCode?: number } };
    if (e.name === "NoSuchKey" || e.$metadata?.httpStatusCode === 404) return null;
    throw err;
  }
}

const INDEX_KEY = "partners/_index.json";

function partnerKey(telegramId: number): string {
  return `partners/${telegramId}.json`;
}

/**
 * Код партнёра — короткий и читаемый вслух: его называют клиенту и пишут
 * в заявке. Из алфавита убраны символы, которые путаются при диктовке (0/O, 1/I).
 */
function makeRefCode(telegramId: number): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let n = telegramId;
  let out = "";
  for (let i = 0; i < 4; i++) {
    out = alphabet[n % alphabet.length] + out;
    n = Math.floor(n / alphabet.length);
  }
  return `AP-${out}`;
}

export async function getPartner(telegramId: number): Promise<Partner | null> {
  if (!s3Configured()) {
    warnMemoryOnce("не заданы переменные S3_*");
    return memory.get(telegramId) ?? null;
  }
  try {
    return await getJson<Partner>(partnerKey(telegramId));
  } catch (err) {
    console.error("[partners-store] Чтение из S3 не удалось, читаем из памяти:", err);
    return memory.get(telegramId) ?? null;
  }
}

export async function savePartner(partner: Partner): Promise<Partner> {
  const updated: Partner = { ...partner, updatedAt: new Date().toISOString() };
  memory.set(updated.telegramId, updated);
  if (!s3Configured()) {
    warnMemoryOnce("не заданы переменные S3_*");
    return updated;
  }
  try {
    await putJson(partnerKey(updated.telegramId), updated);
    const index = (await getJson<number[]>(INDEX_KEY)) ?? [];
    if (!index.includes(updated.telegramId)) {
      index.push(updated.telegramId);
      await putJson(INDEX_KEY, index);
    }
  } catch (err) {
    console.error("[partners-store] Запись в S3 не удалась, партнёр остался только в памяти:", err);
  }
  return updated;
}

/** Находит партнёра или заводит нового. `needsCode` — включён ли код доступа. */
export async function upsertPartner(
  user: { id: number; username?: string; first_name?: string },
  needsCode: boolean,
): Promise<{ partner: Partner; isNew: boolean }> {
  const existing = await getPartner(user.id);
  const now = new Date().toISOString();
  if (existing) {
    const partner: Partner = {
      ...existing,
      username: user.username ?? existing.username,
      firstName: user.first_name ?? existing.firstName,
      lastSeenAt: now,
    };
    await savePartner(partner);
    return { partner, isNew: false };
  }
  const partner: Partner = {
    telegramId: user.id,
    username: user.username ?? null,
    firstName: user.first_name ?? null,
    refCode: makeRefCode(user.id),
    status: needsCode ? "pending_code" : "active",
    createdAt: now,
    updatedAt: now,
    lastSeenAt: now,
    lessonsDone: [],
    deals: [],
    pending: needsCode ? { kind: "access_code" } : null,
  };
  await savePartner(partner);
  return { partner, isNew: true };
}

export async function listPartnerIds(): Promise<number[]> {
  if (!s3Configured()) return [...memory.keys()];
  try {
    return (await getJson<number[]>(INDEX_KEY)) ?? [];
  } catch (err) {
    console.error("[partners-store] Чтение индекса партнёров не удалось:", err);
    return [...memory.keys()];
  }
}
