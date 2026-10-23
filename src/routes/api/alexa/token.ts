import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/alexa/token")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { handleAlexaToken } = await import("@/lib/alexa.server");
        return handleAlexaToken(request);
      },
    },
  },
});
