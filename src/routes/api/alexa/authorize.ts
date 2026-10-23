import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/alexa/authorize")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { handleAlexaAuthorize } = await import("@/lib/alexa.server");
        return handleAlexaAuthorize(request);
      },
    },
  },
});
