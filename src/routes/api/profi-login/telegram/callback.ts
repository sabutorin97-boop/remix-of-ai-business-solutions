import { createFileRoute } from "@tanstack/react-router";
import { handleTelegramLogin } from "@/lib/profi-telegram-runtime.server";

export const Route = createFileRoute("/api/profi-login/telegram/callback")({
  server: { handlers: { GET: ({ request }) => handleTelegramLogin(request, "complete") } },
});
