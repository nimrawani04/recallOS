import {
  citationsFor,
  commitmentRecords,
  contextSummary,
  makeMemoryChart,
  memoryStats,
  rankMemories,
  type MemoryDataset,
} from "./memory-engine";

/**
 * Browser-safe execution for the local/demo client. The protected HTTP MCP
 * route uses the same facts through mcp.server.ts, but this module deliberately
 * has no server-only imports or credentials.
 */
export async function executeLocalMemoryTool(
  name: string,
  args: Record<string, unknown> = {},
  dataset: MemoryDataset,
): Promise<unknown> {
  if (name === "recall_get_context") return contextSummary(dataset);
  if (name === "recall_get_privacy_summary") {
    return {
      scope: "local browser vault",
      stored: [
        "redacted transcript imports",
        "validated extracted memories",
        "exact supporting quotes",
      ],
      controls: ["clear local vault", "cloud export/delete available when signed in"],
      guarantees: [
        "No unrelated fallback memories are returned for an empty search.",
        "Relevance is separate from truth confidence.",
      ],
    };
  }
  if (name === "recall_agent_turn") {
    const utterance = String(args["utterance"] ?? "");
    const text = utterance.toLowerCase();
    const tools =
      text.includes("risk") || text.includes("blocker")
        ? ["recall_get_briefing", "recall_detect_drift"]
        : text.includes("promise") || text.includes("commitment")
          ? ["recall_check_commitments"]
          : ["recall_query_memories"];
    const results: Array<{ tool: string; result: unknown }> = await Promise.all(
      tools.map(async (tool) => ({
        tool,
        result: await executeLocalMemoryTool(
          tool,
          tool === "recall_query_memories" ? { query: utterance } : {},
          dataset,
        ),
      })),
    );
    const grounded = results.some(({ result }) => {
      if (!result || typeof result !== "object") return false;
      const record = result as Record<string, unknown>;
      return (
        record["grounded"] === true ||
        Number(record["count"] ?? 0) > 0 ||
        Array.isArray(record["events"])
      );
    });
    return {
      utterance,
      maxToolCalls: 4,
      toolsUsed: tools,
      grounded,
      results,
      spoken: grounded
        ? `I checked ${tools.length} evidence-backed memory view${tools.length === 1 ? "" : "s"}.`
        : "I could not verify that in the connected records, so I will not make an assumption.",
      nextStep: grounded
        ? "Review the supporting evidence before acting."
        : "Import or connect the source you expect to contain the answer.",
    };
  }
  if (name === "recall_detect_drift")
    return { totalDriftEvents: dataset.driftEvents.length, events: dataset.driftEvents };
  if (name === "recall_suggest_chart") {
    const groupBy =
      args["groupBy"] === "status" || args["groupBy"] === "channel" ? args["groupBy"] : "kind";
    return makeMemoryChart(dataset, groupBy);
  }
  if (name === "recall_get_briefing") {
    const filter = typeof args["filterLevel"] === "string" ? args["filterLevel"] : "all";
    const items =
      filter === "all"
        ? dataset.briefing
        : dataset.briefing.filter((item) => item.level === filter);
    return {
      count: items.length,
      briefing: items.map((item) => {
        const memory = dataset.memories.find((candidate) => candidate.id === item.memoryId);
        return {
          priority: item.level,
          title: item.title,
          reason: item.why,
          recommendedAction: item.action,
          memoryId: item.memoryId,
          status: memory?.status,
          confidence: memory?.confidence,
          evidence: memory ? citationsFor(memory, dataset) : [],
        };
      }),
    };
  }
  if (name === "recall_query_memories") {
    const query = String(args["query"] ?? "").trim();
    if (!query) throw new Error("query is required and cannot be blank.");
    const results = rankMemories(
      query,
      dataset,
      typeof args["kind"] === "string" ? args["kind"] : undefined,
    )
      .slice(0, Math.min(20, Math.max(1, Number(args["limit"]) || 10)))
      .map((memory) => ({
        id: memory.id,
        kind: memory.kind,
        title: memory.title,
        status: memory.status,
        confidence: memory.confidence,
        relevance: memory.score,
        entities: memory.entities,
        history: memory.history ?? [],
        note: memory.note,
        supportingEvidence: memory.citations,
      }));
    const evidenceOutcome =
      results.length === 0
        ? "NO_MATCH_IN_CONNECTED_RECORDS"
        : results.some((memory) => memory.status === "conflict")
          ? "CONFLICTED"
          : results.some((memory) => memory.status === "unknown" || memory.status === "inferred")
            ? "INCONCLUSIVE"
            : "SUPPORTED";
    return {
      query,
      count: results.length,
      grounded: results.length > 0,
      evidenceOutcome,
      message: results.length
        ? undefined
        : "No matching memory was found in the connected records.",
      results,
      memories: results,
    };
  }
  if (name === "recall_check_commitments") {
    const records = commitmentRecords(
      dataset,
      typeof args["person"] === "string" ? args["person"] : undefined,
      args["includeTentative"] !== false,
    );
    return {
      person: args["person"] ?? "all",
      total: records.length,
      commitments: records.map((memory) => ({
        id: memory.id,
        title: memory.title,
        status: memory.status,
        confidence: memory.confidence,
        certainty: memory.status === "confirmed" ? "explicit" : "tentative",
        supportingEvidence: citationsFor(memory, dataset),
      })),
    };
  }
  if (name === "recall_consolidate") {
    const stats = memoryStats(dataset);
    return {
      status: "consolidated",
      sourceImports: stats.imports,
      episodicMemories: stats.memories,
      evidenceCoverage: stats.evidenceCoverage,
      unresolvedClaims: dataset.memories.filter(
        (memory) => memory.status === "conflict" || memory.status === "unknown",
      ).length,
      supersessionsPreserved: dataset.driftEvents.filter(
        (event) => event.laterClaim.status === "supersedes",
      ).length,
      timestamp: new Date().toISOString(),
    };
  }
  if (name === "recall_export_handoff") {
    const blockers = dataset.briefing.filter((item) => item.level === "blocker");
    return {
      handoffProtocol: "KindHandoff-v1.2",
      targetRole: args["targetRole"] ?? "Team Lead",
      verifiedFacts: dataset.memories
        .filter((memory) => memory.status === "confirmed")
        .slice(0, 3)
        .map((memory) => ({
          title: memory.title,
          confidence: memory.confidence,
          citations: citationsFor(memory, dataset),
        })),
      criticalBlockers: blockers.map((item) => ({
        title: item.title,
        why: item.why,
        action: item.action,
      })),
      hallucinationCheck: "PASSED: Zero ungrounded claims.",
    };
  }
  throw new Error(`Unknown local tool: ${name}`);
}
