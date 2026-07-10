import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { createHash } from "node:crypto";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { createLead, updateLead, type LeadSource } from "@/lib/leads-store";
import { sendTelegramMessage } from "@/lib/telegram";

const RL_WINDOW_MS = 60_000;
const RL_MAX = 10;

const SourceDetailsSchema = z.record(z.string(), z.unknown());

const BodySchema = z.object({
  source: z.enum(["contact_form", "lead_magnet", "quiz", "calculator", "max_chat"]),
  name: z.string().trim().max(200).optional(),
  contact: z.string().trim().min(1).max(300),
  message: z.string().trim().max(4000).optional(),
  sourceDetails: SourceDetailsSchema.optional(),
  consent: z.literal(true),
  existingLeadId: z.string().uuid().optional(),
});

const SOURCE_LABELS: Record<LeadSource, string> = {
  contact_form: "Форма заявки",
  lead_magnet: "Лид-магнит (PDF)",
  quiz: "Квиз",
  calculator: "Калькулятор",
  max_chat: "Чат Макс",
};

function ownerNotificationText(lead: {
  source: LeadSource;
  name: string | null;
  contact: string;
  message: string | null;
}): string {
  const lines = [
    "🔥 <b>Новая заявка с сайта AI-Profigrup</b>",
    "",
    `📍 Источник: ${SOURCE_LABELS[lead.source]}`,
  ];
  if (lead.name) lines.push(`👤 Имя: ${escapeHtml(lead.name)}`);
  lines.push(`📞 Контакт: ${escapeHtml(lead.contact)}`);
  if (lead.message) lines.push(`💬 Сообщение: ${escapeHtml(lead.message)}`);
  return lines.join("\n");
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const BOT_USERNAME = "AiProfiGrup_bot";

export const Route = createFileRoute("/api/lead")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const ip = getClientIp(request);
        const rl = rateLimit("lead", ip, { windowMs: RL_WINDOW_MS, max: RL_MAX });
        if (!rl.ok) {
          return new Response("Too Many Requests", {
            status: 429,
            headers: { "Retry-After": String(rl.retryAfter ?? 60) },
          });
        }

        let raw: unknown;
        try {
          raw = await request.json();
        } catch {
          return new Response("Bad Request", { status: 400 });
        }
        const parsed = BodySchema.safeParse(raw);
        if (!parsed.success) {
          return new Response(JSON.stringify({ error: parsed.error.flatten() }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
        const data = parsed.data;
        const ipHash = createHash("sha256").update(ip).digest("hex");
        const userAgent = request.headers.get("user-agent") ?? null;

        let lead;
        if (data.existingLeadId) {
          lead = await updateLead(data.existingLeadId, {
            message: data.message ?? undefined,
            sourceDetails: data.sourceDetails ?? undefined,
          });
        }
        if (!lead) {
          lead = await createLead({
            source: data.source,
            name: data.name ?? null,
            contact: data.contact,
            message: data.message ?? null,
            sourceDetails: data.sourceDetails ?? {},
            ipHash,
            userAgent,
          });
        }

        const ownerChatId = process.env.TELEGRAM_OWNER_CHAT_ID;
        if (ownerChatId && process.env.TELEGRAM_BOT_TOKEN) {
          try {
            await sendTelegramMessage(ownerChatId, ownerNotificationText(lead));
          } catch (err) {
            console.error("Failed to notify owner via Telegram:", err);
          }
        }

        return new Response(
          JSON.stringify({
            leadId: lead.id,
            telegramDeepLink: `https://t.me/${BOT_USERNAME}?start=${lead.id}`,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      },
    },
  },
});
