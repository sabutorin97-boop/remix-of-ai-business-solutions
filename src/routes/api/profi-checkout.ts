import { createFileRoute } from "@tanstack/react-router";
import { handleProfiCheckout } from "@/lib/profi-checkout-runtime.server";

export const Route = createFileRoute("/api/profi-checkout")({
  server: {
    handlers: {
      POST: ({ request }) => handleProfiCheckout(request),
    },
  },
});
