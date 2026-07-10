// Хранилище заявок (лидов) в Timeweb S3 — вместо отдельной СУБД.
// Один лид = один JSON-объект leads/<id>.json. `_index.json` — компактный
// список для быстрого рендера таблицы в /admin без перебора всего бакета.
// Сервер-only: никогда не импортировать в клиентский код (там же лежат
// ключи доступа к бакету).
import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";

export type LeadSource = "contact_form" | "lead_magnet" | "quiz" | "calculator" | "max_chat";
export type FunnelStatus = "new" | "contacted" | "qualified" | "proposal_sent" | "won" | "lost";

export interface Lead {
  id: string;
  createdAt: string;
  updatedAt: string;
  source: LeadSource;
  name: string | null;
  contact: string;
  message: string | null;
  sourceDetails: Record<string, unknown>;
  funnelStatus: FunnelStatus;
  notes: string | null;
  telegramChatId: number | null;
  telegramUsername: string | null;
  telegramLinkedAt: string | null;
  consentAt: string;
  ipHash: string | null;
  userAgent: string | null;
}

export interface LeadMessage {
  id: string;
  direction: "inbound" | "outbound";
  sender: "visitor" | "bot_ai" | "owner";
  body: string;
  createdAt: string;
}

interface IndexEntry {
  id: string;
  createdAt: string;
  source: LeadSource;
  funnelStatus: FunnelStatus;
  contact: string;
  name: string | null;
}

let cachedClient: S3Client | null = null;

function client(): S3Client {
  if (cachedClient) return cachedClient;
  const endpoint = process.env.S3_ENDPOINT;
  const region = process.env.S3_REGION;
  const accessKeyId = process.env.S3_ACCESS_KEY;
  const secretAccessKey = process.env.S3_SECRET_KEY;
  if (!endpoint || !region || !accessKeyId || !secretAccessKey) {
    throw new Error("Missing S3_* env vars for leads store");
  }
  cachedClient = new S3Client({
    endpoint,
    region,
    forcePathStyle: true,
    credentials: { accessKeyId, secretAccessKey },
  });
  return cachedClient;
}

function bucket(): string {
  const b = process.env.S3_BUCKET;
  if (!b) throw new Error("Missing S3_BUCKET");
  return b;
}

async function putJson(key: string, value: unknown): Promise<void> {
  await client().send(
    new PutObjectCommand({
      Bucket: bucket(),
      Key: key,
      Body: JSON.stringify(value, null, 2),
      ContentType: "application/json",
    }),
  );
}

async function getJson<T>(key: string): Promise<T | null> {
  try {
    const res = await client().send(new GetObjectCommand({ Bucket: bucket(), Key: key }));
    const text = await res.Body?.transformToString();
    return text ? (JSON.parse(text) as T) : null;
  } catch (err) {
    const e = err as { name?: string; $metadata?: { httpStatusCode?: number } };
    if (e.name === "NoSuchKey" || e.$metadata?.httpStatusCode === 404) return null;
    throw err;
  }
}

const INDEX_KEY = "leads/_index.json";

async function readIndex(): Promise<IndexEntry[]> {
  return (await getJson<IndexEntry[]>(INDEX_KEY)) ?? [];
}

function toIndexEntry(lead: Lead): IndexEntry {
  return {
    id: lead.id,
    createdAt: lead.createdAt,
    source: lead.source,
    funnelStatus: lead.funnelStatus,
    contact: lead.contact,
    name: lead.name,
  };
}

export async function createLead(input: {
  source: LeadSource;
  name?: string | null;
  contact: string;
  message?: string | null;
  sourceDetails?: Record<string, unknown>;
  ipHash?: string | null;
  userAgent?: string | null;
}): Promise<Lead> {
  const now = new Date().toISOString();
  const lead: Lead = {
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    source: input.source,
    name: input.name ?? null,
    contact: input.contact,
    message: input.message ?? null,
    sourceDetails: input.sourceDetails ?? {},
    funnelStatus: "new",
    notes: null,
    telegramChatId: null,
    telegramUsername: null,
    telegramLinkedAt: null,
    consentAt: now,
    ipHash: input.ipHash ?? null,
    userAgent: input.userAgent ?? null,
  };
  await putJson(`leads/${lead.id}.json`, lead);
  const index = await readIndex();
  index.unshift(toIndexEntry(lead));
  await putJson(INDEX_KEY, index);
  return lead;
}

export async function getLead(id: string): Promise<Lead | null> {
  return getJson<Lead>(`leads/${id}.json`);
}

export async function updateLead(id: string, patch: Partial<Lead>): Promise<Lead | null> {
  const existing = await getLead(id);
  if (!existing) return null;
  const updated: Lead = { ...existing, ...patch, id: existing.id, updatedAt: new Date().toISOString() };
  await putJson(`leads/${id}.json`, updated);
  const index = await readIndex();
  const idx = index.findIndex((e) => e.id === id);
  if (idx >= 0) {
    index[idx] = toIndexEntry(updated);
    await putJson(INDEX_KEY, index);
  }
  return updated;
}

export async function listLeads(): Promise<IndexEntry[]> {
  return readIndex();
}

export async function appendLeadMessage(
  leadId: string,
  msg: Omit<LeadMessage, "id" | "createdAt">,
): Promise<LeadMessage> {
  const key = `leads/${leadId}/messages.json`;
  const existing = (await getJson<LeadMessage[]>(key)) ?? [];
  const full: LeadMessage = { ...msg, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
  existing.push(full);
  await putJson(key, existing);
  return full;
}

export async function getLeadMessages(leadId: string): Promise<LeadMessage[]> {
  return (await getJson<LeadMessage[]>(`leads/${leadId}/messages.json`)) ?? [];
}

// На случай будущего роста объёма — не используется в UI, но полезно для
// диагностики/бэкапа: полный обход бакета без опоры на _index.json.
export async function listAllLeadKeys(): Promise<string[]> {
  const out: string[] = [];
  let ContinuationToken: string | undefined;
  do {
    const res = await client().send(
      new ListObjectsV2Command({ Bucket: bucket(), Prefix: "leads/", ContinuationToken }),
    );
    for (const obj of res.Contents ?? []) {
      if (obj.Key && /^leads\/[0-9a-f-]+\.json$/.test(obj.Key)) out.push(obj.Key);
    }
    ContinuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (ContinuationToken);
  return out;
}
