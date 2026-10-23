import { describe, expect, it } from "vitest";
import { applyAmbientGuard } from "@/lib/ambient-guard";
import { detectMentalModelDrift } from "@/lib/temporal-drift";
import { executeMCPTool, handleMCPRequest, MCP_TOOLS } from "@/lib/mcp.server";
import { buildDataset, makeMemoryChart, rankMemories } from "@/lib/memory-engine";
import { createTestDataset, testMemories, testDriftEvents } from "./fixtures";

describe("RecallOS Core Capabilities", () => {
  const testDataset = createTestDataset();

  describe("Ambient Guard Privacy Filter", () => {
    it("redacts API keys, credentials, and ambient background chatter", () => {
      const input =
        "My key is sk-1234567890abcdef1234567890 and password: 'supersecret' [TV playing in background: news]. Call me at 555-123-4567.";
      const res = applyAmbientGuard(input);

      expect(res.sanitized).toContain("[REDACTED_API_KEY]");
      expect(res.sanitized).toContain("[REDACTED_SECRET]");
      expect(res.sanitized).toContain("[AMBIENT_IGNORED]");
      expect(res.sanitized).toContain("[REDACTED_PHONE]");
      expect(res.redactedCount).toBeGreaterThanOrEqual(4);
    });
  });

  describe("Temporal Drift & Supersession Detection", () => {
    it("detects deadline supersession and unverified assumptions", () => {
      const events = detectMentalModelDrift(testMemories, testDriftEvents);
      expect(events.length).toBeGreaterThanOrEqual(2);

      const deadlineDrift = events.find((e) => e.type === "deadline_shift");
      expect(deadlineDrift).toBeDefined();
      expect(deadlineDrift?.earlierClaim.statement).toContain("Friday 6pm");
      expect(deadlineDrift?.laterClaim.statement).toContain("Sunday noon");
      expect(deadlineDrift?.laterClaim.status).toBe("supersedes");
    });
  });

  describe("Model Context Protocol (MCP) Server", () => {
    it("exposes all required hackathon tools", () => {
      const toolNames = MCP_TOOLS.map((t) => t.name);
      expect(toolNames).toContain("recall_get_briefing");
      expect(toolNames).toContain("recall_query_memories");
      expect(toolNames).toContain("recall_check_commitments");
      expect(toolNames).toContain("recall_detect_drift");
      expect(toolNames).toContain("recall_consolidate");
      expect(toolNames).toContain("recall_agent_turn");
      expect(toolNames).toContain("recall_delete_import");
    });

    it("executes recall_query_memories and returns verbatim evidence quotes", async () => {
      const res = (await executeMCPTool(
        "recall_query_memories",
        { query: "deadline" },
        testDataset,
      )) as {
        count: number;
        results: Array<{ supportingEvidence: Array<{ passage: string }> }>;
      };

      expect(res.count).toBeGreaterThan(0);
      expect(res.results[0]!.supportingEvidence.length).toBeGreaterThan(0);
      expect(res.results[0]!.supportingEvidence[0]!.passage).toBeDefined();
    });

    it("executes recall_check_commitments with explicit vs tentative distinction", async () => {
      const res = (await executeMCPTool(
        "recall_check_commitments",
        { person: "You" },
        testDataset,
      )) as {
        total: number;
        commitments: Array<{ certainty: string; title: string }>;
      };

      expect(res.total).toBe(2);
      const certainties = res.commitments.map((c) => c.certainty);
      expect(certainties).toContain("explicit");
      expect(certainties).toContain("tentative");
    });

    it("does not return unrelated records when a query has no match", async () => {
      const res = (await executeMCPTool(
        "recall_query_memories",
        {
          query: "quantum submarine launch",
        },
        testDataset,
      )) as {
        count: number;
        grounded: boolean;
        evidenceOutcome: string;
        results: unknown[];
      };

      expect(res.count).toBe(0);
      expect(res.grounded).toBe(false);
      expect(res.evidenceOutcome).toBe("NO_MATCH_IN_CONNECTED_RECORDS");
      expect(res.results).toHaveLength(0);
    });

    it("rejects an empty query instead of dumping the owner vault", async () => {
      await expect(
        executeMCPTool("recall_query_memories", { query: "   " }, testDataset),
      ).rejects.toThrow("query is required");
      const privateDataset = buildDataset([], { includeDemo: false });
      const res = (await executeMCPTool(
        "recall_query_memories",
        { query: "deadline" },
        privateDataset,
      )) as {
        count: number;
      };
      expect(res.count).toBe(0);
    });

    it("keeps relevance, evidence, and facts-checked charts separate", () => {
      const results = rankMemories("demo deadline", testDataset);
      const chart = makeMemoryChart(testDataset, "status");

      expect(results[0]!.score).toBeGreaterThan(0);
      expect(results[0]!.citations.length).toBeGreaterThan(0);
      expect(chart.factsChecked).toBe(true);
      expect(chart.data.reduce((sum, point) => sum + point.value, 0)).toBe(
        testDataset.memories.length,
      );
    });

    it("bounds the multi-tool agent turn and preserves evidence-only fallback wording", async () => {
      const res = (await executeMCPTool(
        "recall_agent_turn",
        {
          utterance: "Why is the demo at risk and what did I promise?",
        },
        testDataset,
      )) as {
        maxToolCalls: number;
        toolsUsed: string[];
        grounded: boolean;
        spoken: string;
      };

      expect(res.maxToolCalls).toBe(4);
      expect(res.toolsUsed.length).toBeLessThanOrEqual(4);
      expect(res.grounded).toBe(true);
      expect(res.spoken).toContain("evidence-backed");
    });

    it("rejects unauthenticated HTTP tool calls before touching the vault", async () => {
      const response = await handleMCPRequest(
        new Request("http://localhost/api/mcp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
        }),
      );

      expect(response.status).toBe(401);
      expect(response.headers.get("www-authenticate")).toBe("Bearer");
    });

    it("executes recall_export_handoff (KindHandoff protocol)", async () => {
      const res = (await executeMCPTool(
        "recall_export_handoff",
        {
          targetRole: "Project Lead",
        },
        testDataset,
      )) as {
        handoffProtocol: string;
        urgencyScore: number;
        verifiedFacts: Array<{ title: string }>;
        hallucinationCheck: string;
      };

      expect(res.handoffProtocol).toBe("KindHandoff-v1.2");
      expect(res.hallucinationCheck).toContain("PASSED");
      expect(res.verifiedFacts.length).toBeGreaterThan(0);
    });

    it("executes recall_schedule_followup (Yasmin/Hearthbeat retention)", async () => {
      const res = (await executeMCPTool(
        "recall_schedule_followup",
        { person: "You" },
        testDataset,
      )) as {
        scheduler: string;
        triggers: Array<{ due: string; prompt: string }>;
      };

      expect(res.scheduler).toBe("Yasmin-Spaced-Retention");
      expect(res.triggers.length).toBeGreaterThanOrEqual(1);
      expect(res.triggers[0]!.prompt).toContain("Alexa");
    });

    it("executes recall_get_core_memory_blocks (Letta/Mem0 tiered memory)", async () => {
      const res = (await executeMCPTool("recall_get_core_memory_blocks", {}, testDataset)) as {
        framework: string;
        coreBlocks: Array<{ block: string; pinned: boolean }>;
      };

      expect(res.framework).toBe("Letta-Mem0-Tiered-Core");
      expect(res.coreBlocks.length).toBeGreaterThanOrEqual(2);
      expect(res.coreBlocks.some((b) => b.pinned)).toBe(true);
    });
  });
});
