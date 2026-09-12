// Обезличенный учёт переходов на Telegram-канал в Timeweb S3.
//
// Зачем своё хранилище, а не Метрика: счётчик грузится только после согласия
// в баннере (запись сессий — персональные данные по 152-ФЗ), поэтому часть
// переходов Метрика не видит, и стоимость подписчика в рекламе не посчитать.
//
// Что пишем: время, метку источника, место нажатия и тип пригласительной
// ссылки. Ни IP, ни User-Agent, ни cookie — персональных данных в событии нет,
// поэтому согласие для такого учёта не требуется.
//
// Одно событие = один объект `clicks/tg/<дата>/<время>__<метка>__<место>__<тип>__<код>.json`.
// Данные закодированы в самом имени: сводка за день считается листингом
// префикса, без чтения каждого объекта. Тело дублирует их читаемым JSON —
// пригодится, если понадобится выгрузка.
//
// Сервер-only: никогда не импортировать в клиентский код (здесь ключи бакета).
import { S3Client, PutObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";

import type { ChannelAudience } from "@/lib/telegram-channel";

export interface ChannelClick {
  at: string;
  source: string;
  place: string;
  audience: ChannelAudience;
}

export interface ClickReport {
  day: string;
  total: number;
  bySource: Record<string, number>;
  byPlace: Record<string, number>;
  byAudience: Record<string, number>;
}

const PREFIX = "clicks/tg";

let cachedClient: S3Client | null = null;

function client(): S3Client {
  if (cachedClient) return cachedClient;
  const endpoint = process.env.S3_ENDPOINT;
  const region = process.env.S3_REGION;
  const accessKeyId = process.env.S3_ACCESS_KEY;
  const secretAccessKey = process.env.S3_SECRET_KEY;
  if (!endpoint || !region || !accessKeyId || !secretAccessKey) {
    throw new Error("Missing S3_* env vars for click store");
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

/** Настроено ли хранилище. Без него переход всё равно работает, но не считается. */
export function clickStoreConfigured(): boolean {
  return Boolean(
    process.env.S3_ENDPOINT &&
    process.env.S3_REGION &&
    process.env.S3_BUCKET &&
    process.env.S3_ACCESS_KEY &&
    process.env.S3_SECRET_KEY,
  );
}

/**
 * Часть имени объекта. Разделитель полей — двойное подчёркивание, поэтому
 * подчёркивания внутри значения становятся дефисами: место «blog_post»
 * читается в отчёте как «blog-post», а не склеивается в «blogpost».
 */
function slug(value: string): string {
  const safe = value
    .toLowerCase()
    .replace(/_/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, 24);
  return safe || "none";
}

/**
 * Записать переход. Ошибку наружу не пускаем: переход человека в канал важнее
 * строчки в отчёте, и падать из-за недоступного бакета редирект не должен.
 */
export async function recordChannelClick(click: ChannelClick): Promise<boolean> {
  if (!clickStoreConfigured()) return false;

  const day = click.at.slice(0, 10);
  const time = click.at.slice(11, 23).replace(/[:.]/g, "");
  const code = Math.random().toString(36).slice(2, 8);
  const key = `${PREFIX}/${day}/${time}__${slug(click.source)}__${slug(click.place)}__${slug(
    click.audience,
  )}__${code}.json`;

  try {
    await client().send(
      new PutObjectCommand({
        Bucket: bucket(),
        Key: key,
        Body: JSON.stringify(click),
        ContentType: "application/json",
      }),
    );
    return true;
  } catch (error) {
    console.error("[clicks] не удалось записать переход:", error);
    return false;
  }
}

/** Сводка за день: сколько переходов и по каким меткам. */
export async function channelClickReport(day: string): Promise<ClickReport> {
  const report: ClickReport = { day, total: 0, bySource: {}, byPlace: {}, byAudience: {} };
  if (!clickStoreConfigured()) return report;

  let token: string | undefined;
  do {
    const page = await client().send(
      new ListObjectsV2Command({
        Bucket: bucket(),
        Prefix: `${PREFIX}/${day}/`,
        ContinuationToken: token,
      }),
    );

    for (const item of page.Contents ?? []) {
      const name = (item.Key ?? "").split("/").pop() ?? "";
      const [, source, place, audience] = name.replace(/\.json$/, "").split("__");
      if (!source) continue;
      report.total += 1;
      report.bySource[source] = (report.bySource[source] ?? 0) + 1;
      report.byPlace[place] = (report.byPlace[place] ?? 0) + 1;
      report.byAudience[audience] = (report.byAudience[audience] ?? 0) + 1;
    }

    token = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (token);

  return report;
}
