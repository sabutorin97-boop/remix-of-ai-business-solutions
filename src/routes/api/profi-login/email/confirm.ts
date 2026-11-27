import { createFileRoute } from "@tanstack/react-router";
import { handleEmailLogin } from "@/lib/profi-email-runtime.server";

export const Route = createFileRoute("/api/profi-login/email/confirm")({
  server: { handlers: { POST: ({ request }) => handleEmailLogin(request, "confirm") } },
});
