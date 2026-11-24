import { createHmac, randomBytes } from "node:crypto";
import { createFileRoute } from "@tanstack/react-router";
import { packagePrices } from "@/lib/shop-catalog";

const codes = ["base", "photo", "video", "design", "dev", "all"] as const;

export const Route = createFileRoute("/api/shop-transfer")({
  server: {
    handlers: {
      GET: ({ request }) => {
        const secret = process.env.SHOP_TRANSFER_SECRET;
        const bot = process.env.SHOP_TELEGRAM_BOT;
        if (!secret || secret.length < 32 || !bot || !/^[A-Za-z0-9_]{5,32}$/.test(bot)) {
          return new Response("Оплата наличными пока недоступна.", { status: 503 });
        }
        const requested = new URL(request.url).searchParams.get("sku")?.split(",") ?? [];
        const selected = codes.filter((code) => requested.includes(code));
        if (!selected.length || requested.length !== selected.length ||
            (selected.includes("all") && selected.length !== 1)) {
          return new Response("Проверьте состав заказа.", { status: 400 });
        }

        const payload = Buffer.alloc(17);
        payload[0] = selected.reduce((mask, code) => mask | (1 << codes.indexOf(code)), 0);
        payload.writeUInt32BE(Math.floor(Date.now() / 1000) + 1800, 1);
        payload.writeUInt32BE(selected.reduce((total, code) => total + packagePrices[code], 0), 5);
        randomBytes(8).copy(payload, 9);
        const signature = createHmac("sha256", secret).update(payload).digest().subarray(0, 12);
        const token = Buffer.concat([payload, signature]).toString("base64url");
        return new Response(null, {
          status: 303,
          headers: { Location: `https://t.me/${bot}?start=order_${token}`, "Cache-Control": "no-store" },
        });
      },
    },
  },
});
