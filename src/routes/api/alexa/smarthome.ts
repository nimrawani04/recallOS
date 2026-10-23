import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/alexa/smarthome")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { handleAlexaSmartHome } = await import("@/lib/alexa.server");
        return handleAlexaSmartHome(request);
      },
    },
  },
});
