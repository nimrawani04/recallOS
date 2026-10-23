import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/ring/link")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { handleRingLink } = await import("@/lib/device-connections.functions");
        return handleRingLink(request);
      },
    },
  },
});
