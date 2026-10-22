import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/mcp")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { handleMCPRequest } = await import("@/lib/mcp.server");
        return handleMCPRequest(request);
      },
      POST: async ({ request }) => {
        const { handleMCPRequest } = await import("@/lib/mcp.server");
        return handleMCPRequest(request);
      },
      DELETE: async ({ request }) => {
        const { handleMCPRequest } = await import("@/lib/mcp.server");
        return handleMCPRequest(request);
      },
    },
  },
});
