import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/ring/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { handleRingWebhook } = await import("@/lib/ring-webhook.server");
        return handleRingWebhook(request);
      },
    },
  },
});
