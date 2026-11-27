import { createFileRoute } from "@tanstack/react-router";
import { handleProfiAccount } from "@/lib/profi-account-runtime.server";

export const Route = createFileRoute("/api/profi-account")({
  server: { handlers: {
    GET: ({ request }) => handleProfiAccount(request),
    POST: ({ request }) => handleProfiAccount(request),
  } },
});
