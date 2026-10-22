import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/api/extract")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { handleExtraction } = await import("@/lib/extract.server");
        return handleExtraction(request);
      },
    },
  },
});
