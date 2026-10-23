import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/ring/token-exchange")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { handleRingTokenExchange } = await import("@/lib/device-connections.functions");
        return handleRingTokenExchange(request);
      },
    },
  },
});
