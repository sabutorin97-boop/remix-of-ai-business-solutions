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
  /** Имя из приглашения: под ним партнёр виден в списке владельца. */
  label?: string;
  /** Код приглашения, по которому партнёр получил доступ. */
  inviteCode?: string;
  /** blocked — сотрудничество прекращено: история сохраняется, вход закрыт. */
  status: "active" | "pending_code" | "blocked";
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
const INVITES_KEY = "partners/_invites.json";

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

// --- Приглашения ------------------------------------------------------------

/**
 * Личное приглашение партнёра. Один код — один человек, поэтому отозвать
 * доступ можно у одного, не трогая остальных: общий код на всех такого не
 * позволяет (см. PARTNER_BOT_ACCESS_CODE, он остался как запасной вариант).
 */
export interface PartnerInvite {
  code: string;
  /** Имя, под которым партнёр будет виден владельцу. */
  label: string;
  createdAt: string;
  usedBy: number | null;
  usedAt: string | null;
  /** Отозвано при блокировке партнёра: запись остаётся ради истории. */
  revokedAt?: string;
}

let inviteMemory: PartnerInvite[] = [];

/** Код диктуют вслух и пересылают в ссылке, поэтому он короткий и без похожих символов. */
function makeInviteCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
    if (i === 2) out += "-";
  }
  return `AP-${out}`;
}

export async function listInvites(): Promise<PartnerInvite[]> {
  if (!s3Configured()) return inviteMemory;
  try {
    return (await getJson<PartnerInvite[]>(INVITES_KEY)) ?? [];
  } catch (err) {
    console.error("[partners-store] Чтение приглашений не удалось:", err);
    return inviteMemory;
  }
}

async function saveInvites(invites: PartnerInvite[]): Promise<void> {
  inviteMemory = invites;
  if (!s3Configured()) return;
  try {
    await putJson(INVITES_KEY, invites);
  } catch (err) {
    console.error("[partners-store] Запись приглашений не удалась:", err);
  }
}

export async function createInvite(label: string): Promise<PartnerInvite> {
  const invites = await listInvites();
  const invite: PartnerInvite = {
    code: makeInviteCode(),
    label: label.trim().slice(0, 100) || "Партнёр",
    createdAt: new Date().toISOString(),
    usedBy: null,
    usedAt: null,
  };
  await saveInvites([...invites, invite]);
  return invite;
}

/**
 * Пытается принять код от партнёра. Приглашение одноразовое: второй человек по
 * тому же коду не войдёт, а тот же самый — войдёт снова (например, после
 * перезахода в бот).
 */
export async function redeemInvite(
  code: string,
  telegramId: number,
): Promise<PartnerInvite | null> {
  const wanted = code.trim().toUpperCase();
  const invites = await listInvites();
  const invite = invites.find((i) => i.code.toUpperCase() === wanted);
  if (!invite || invite.revokedAt) return null;
  if (invite.usedBy !== null && invite.usedBy !== telegramId) return null;
  if (invite.usedBy === null) {
    invite.usedBy = telegramId;
    invite.usedAt = new Date().toISOString();
    await saveInvites(invites);
  }
  return invite;
}

/**
 * Отзывает приглашение, но не стирает его: по записи потом видно, кого и когда
 * приглашали. Удаление было бы опаснее — от количества приглашений когда-то
 * зависела сама проверка доступа.
 */
export async function revokeInvite(code: string): Promise<boolean> {
  const wanted = code.trim().toUpperCase();
  const invites = await listInvites();
  const invite = invites.find((i) => i.code.toUpperCase() === wanted);
  if (!invite || invite.revokedAt) return false;
  invite.revokedAt = new Date().toISOString();
  await saveInvites(invites);
  return true;
}

// --- Список партнёров -------------------------------------------------------

/** Полные записи всех партнёров: для списка и статистики у владельца. */
export async function listPartners(): Promise<Partner[]> {
  const ids = await listPartnerIds();
  const partners: Partner[] = [];
  for (const id of ids) {
    const partner = await getPartner(id);
    if (partner) partners.push(partner);
  }
  return partners.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/** Поиск по коду партнёра, telegram id или @username — как удобнее владельцу. */
export async function findPartner(identifier: string): Promise<Partner | null> {
  const raw = identifier.trim().replace(/^@/, "").toUpperCase();
  if (!raw) return null;
  const partners = await listPartners();
  return (
    partners.find(
      (p) =>
        p.refCode.toUpperCase() === raw ||
        String(p.telegramId) === raw ||
        (p.username ?? "").toUpperCase() === raw ||
        (p.inviteCode ?? "").toUpperCase() === raw,
    ) ?? null
  );
}
