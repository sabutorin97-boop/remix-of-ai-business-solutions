import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import { broadcastToPartners, partnerBotToken } from "@/lib/partner-bot";

/**
 * Админ-рассылка партнёрам без бота: чтобы пост уходил по команде агента,
 * а не после ручных нажатий владельца.
 *
 * Авторизация — токен самого бота в заголовке `Authorization: Bearer ...`.
 * Отдельного секрета не заводим: токен уже есть у того, кто ведёт рассылку,
 * и он не появляется в URL (значит, и в логах прокси).
 *
 *   POST /api/partner/broadcast
 *   { "text": "...", "photo": "https://aiprofigrup.ru/broadcast/foo.jpg", "dryRun": true }
 *
 * `dryRun` считает получателей и ничего не отправляет — с него и начинать.
 */
function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export const Route = createFileRoute("/api/partner/broadcast")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const token = partnerBotToken();
        if (!token) return json({ error: "TELEGRAM_PARTNER_BOT_TOKEN не задан" }, 503);

        const given = (request.headers.get("authorization") ?? "")
          .replace(/^Bearer\s+/i, "")
          .trim();
        if (!given || given !== token) return new Response("Unauthorized", { status: 401 });

        let body: Record<string, unknown>;
        try {
          body = (await request.json()) as Record<string, unknown>;
        } catch {
          return json({ error: "Тело запроса — не JSON" }, 400);
        }

        try {
          const action = typeof body.action === "string" ? body.action : "broadcast";

          if (action === "list") {
            // Вернуть всех активных партнёров (кроме владельца).
            const { listPartners } = await import("@/lib/partner-bot");
            const owner = process.env.TELEGRAM_OWNER_CHAT_ID?.trim();
            const partners = await listPartners();
            const list = partners
              .filter(
                (p: any) =>
                  p.status === "active" && String(p.telegramId) !== owner,
              )
              .map((p: any) => ({
                id: p.telegramId,
                label: p.label,
                username: p.username,
                phone: p.phone,
              }));
            return json({ ok: true, count: list.length, partners: list });
          }

          if (action === "remove") {
            const id = Number(body.telegramId);
            if (!id) return json({ error: "telegramId (number) обязателен" }, 400);
            const { listPartners, savePartner } = await import("@/lib/partner-bot");
            const partners = await listPartners();
            const idx = partners.findIndex((p: any) => Number(p.telegramId) === id);
            if (idx === -1) return json({ error: "Партнёр не найден" }, 404);
            partners[idx].status = "blocked";
            await savePartner(partners[idx]);
            return json({ ok: true, removed: id, label: partners[idx].label });
          }

          // По умолчанию — рассылка.
          const result = await broadcastToPartners({
            text: typeof body.text === "string" ? body.text : "",
            photo: typeof body.photo === "string" ? body.photo : undefined,
            dryRun: body.dryRun === true,
          });
          return json({ ok: true, ...result });
        } catch (err) {
          return json({ error: err instanceof Error ? err.message : String(err) }, 400);
        }
      },
    },
  },
});
