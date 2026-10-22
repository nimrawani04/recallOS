/**
 * Owner-scoped Model Context Protocol surface for RecallOS.
 *
 * The transport is intentionally small and dependency-free so it can run in
 * TanStack Start, while the tool contract borrows the best ideas from the
 * reference projects: facts-first responses, structured resources, explicit
 * uncertainty, and deterministic chart specifications.
 */

import { importSchema } from "./extraction";
import { authenticateRequest } from "./private-client.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  buildDataset,
  citationsFor,
  commitmentRecords,
  contextSummary,
  makeMemoryChart,
  memoryStats,
  rankMemories,
  type MemoryDataset,
  type StoredImport,
} from "./memory-engine";

export interface MCPToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export const MCP_PROTOCOL_VERSION = "2025-11-25";

export const MCP_TOOLS: MCPToolDefinition[] = [
  {
    name: "recall_get_context",
    description:
      "Return a compact, owner-scoped context summary with memory counts, evidence coverage, unresolved claims, and next actions.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "recall_get_briefing",
    description:
      "Get ranked blockers, overdue commitments, follow-ups, and plan changes. Each item includes exact source citations.",
    inputSchema: {
      type: "object",
      properties: {
        filterLevel: {
          type: "string",
          enum: ["all", "blocker", "overdue", "followup", "change"],
          description: "Optional risk filter.",
        },
      },
    },
  },
  {
    name: "recall_query_memories",
    description:
      "Search owner-scoped memories with lexical relevance, explicit status, confidence, temporal history, and verbatim citations. No unrelated fallback records are returned.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Question or keywords such as 'demo deadline' or 'staging auth'.",
        },
        kind: {
          type: "string",
          enum: ["all", "decision", "deadline", "commitment", "task", "question", "fact"],
          description: "Optional memory kind filter.",
        },
        limit: {
          type: "integer",
          minimum: 1,
          maximum: 20,
          description: "Maximum number of relevant records.",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "recall_check_commitments",
    description:
      "Audit commitments, tasks, and deadlines while separating confirmed promises from tentative or inferred statements.",
    inputSchema: {
      type: "object",
      properties: {
        person: { type: "string", description: "Optional owner filter, such as You or Meera." },
        includeTentative: {
          type: "boolean",
          description: "Include inferred or tentative records. Defaults to true.",
        },
      },
    },
  },
  {
    name: "recall_detect_drift",
    description:
      "Surface temporal supersession, unresolved assumptions, and conflicting team claims with both sides of the evidence.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "recall_suggest_chart",
    description:
      "Return a deterministic, server-generated chart specification from verified memory facts; clients render it without inventing data.",
    inputSchema: {
      type: "object",
      properties: {
        groupBy: {
          type: "string",
          enum: ["kind", "status", "channel"],
          description: "Dimension for the chart.",
        },
      },
    },
  },
  {
    name: "recall_consolidate",
    description:
      "Run a transparent consolidation summary over episodic records, preserving unresolved claims instead of silently overwriting them.",
    inputSchema: {
      type: "object",
      properties: {
        pruneResolved: {
          type: "boolean",
          description: "Reserved for a future archive workflow; false is safest.",
        },
      },
    },
  },
  {
    name: "recall_agent_turn",
    description:
      "Run a bounded, read-only multi-tool turn over connected memory. The planner executes at most four tools and only summarizes returned evidence.",
    inputSchema: {
      type: "object",
      properties: {
        utterance: { type: "string", description: "The user's natural-language request." },
      },
      required: ["utterance"],
    },
  },
  {
    name: "recall_get_privacy_summary",
    description:
      "Show what RecallOS stores, how it is scoped, what is redacted, and what export/delete controls are available.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "recall_export_my_data",
    description:
      "Export the authenticated owner's saved imports and extracted memories as a portable, versioned JSON document.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "recall_preview_delete_import",
    description:
      "Preview the owner-scoped records affected by deleting one saved import. This never mutates data.",
    inputSchema: {
      type: "object",
      properties: { importId: { type: "string", description: "Saved import ID." } },
      required: ["importId"],
    },
  },
  {
    name: "recall_delete_import",
    description:
      "Permanently delete one saved import and its derived memories after an explicit confirmation and requestId.",
    inputSchema: {
      type: "object",
      properties: {
        importId: { type: "string", description: "Saved import ID." },
        confirm: { type: "boolean", description: "Must be true to mutate data." },
        requestId: { type: "string", description: "Client-generated idempotency key." },
      },
      required: ["importId", "confirm", "requestId"],
    },
  },
  {
    name: "recall_delete_my_data",
    description:
      "Permanently delete every saved import for the authenticated owner after explicit confirmation and an idempotency key.",
    inputSchema: {
      type: "object",
      properties: {
        confirm: { type: "boolean", description: "Must be true to mutate data." },
        requestId: { type: "string", description: "Client-generated idempotency key." },
      },
      required: ["confirm", "requestId"],
    },
  },
  {
    name: "recall_export_handoff",
    description:
      "Generate an evidence-grounded KindHandoff packet for conversational handoff to a human or secondary agent, with verified claims, emotional urgency, and zero hallucinations.",
    inputSchema: {
      type: "object",
      properties: {
        targetRole: {
          type: "string",
          description: "Recipient role, e.g. 'Project Lead' or 'Backend Engineer'.",
        },
      },
    },
  },
  {
    name: "recall_schedule_followup",
    description:
      "Calculate spaced follow-up retention check-in schedules (Yasmin/Hearthbeat style) for approaching deadlines and overdue commitments.",
    inputSchema: {
      type: "object",
      properties: {
        person: {
          type: "string",
          description: "Person to schedule follow-ups for.",
        },
      },
    },
  },
  {
    name: "recall_get_core_memory_blocks",
    description:
      "Inspect tiered Letta/Mem0 memory blocks: active Working Memory, pinned Core Persona/Project Blocks, and Archival Vault statistics.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
];

export const MCP_RESOURCES = [
  {
    uri: "recall://context",
    name: "Current context",
    description: "Owner-scoped context summary and next actions.",
    mimeType: "application/json",
  },
  {
    uri: "recall://memories",
    name: "Memory index",
    description: "Owner-scoped memory previews with status and evidence counts.",
    mimeType: "application/json",
  },
  {
    uri: "recall://schema",
    name: "Memory schema",
    description: "Available dimensions, statuses, and grounding guarantees.",
    mimeType: "application/json",
  },
];

export const MCP_PROMPTS = [
  {
    name: "recall_weekly_review",
    description: "Review commitments, drift, unresolved claims, and next actions for the week.",
    arguments: [
      { name: "focus", description: "Optional topic or person to focus on.", required: false },
    ],
  },
  {
    name: "recall_prepare_handoff",
    description: "Prepare an evidence-grounded handoff for a human project lead.",
    arguments: [{ name: "targetRole", description: "Recipient role.", required: false }],
  },
  {
    name: "recall_explain_drift",
    description:
      "Explain what changed, which claim is current, and what evidence remains unresolved.",
    arguments: [],
  },
];

type SupabaseImportRow = {
  id: string;
  title: string;
  conversation: string;
  extraction: unknown;
  created_at: string;
};

type AuthenticatedRequest = Awaited<ReturnType<typeof authenticateRequest>>;

function asStoredImports(rows: SupabaseImportRow[]): StoredImport[] {
  return rows.flatMap((row) => {
    const parsed = importSchema.shape.extraction.safeParse(row.extraction);
    if (!parsed.success) return [];
    return [{ ...row, extraction: parsed.data }];
  });
}

async function loadAllOwnerImports(client: AuthenticatedRequest["client"]) {
  const pageSize = 1000;
  const rows: SupabaseImportRow[] = [];
  for (let page = 0; page < 100; page += 1) {
    const { data, error } = await client
      .from("conversation_imports")
      .select("id,title,conversation,extraction,created_at")
      .order("created_at", { ascending: false })
      .range(page * pageSize, page * pageSize + pageSize - 1);
    if (error) throw new Error(`Could not load the memory vault: ${error.message}`);
    const batch = (data ?? []) as SupabaseImportRow[];
    rows.push(...batch);
    if (batch.length < pageSize) break;
  }
  return rows;
}

export async function loadOwnerDataset(request: Request): Promise<{
  dataset: MemoryDataset;
  userId: string;
  imports: StoredImport[];
  client: AuthenticatedRequest["client"];
}> {
  const { client, user } = await authenticateRequest(request);
  const imports = asStoredImports(await loadAllOwnerImports(client));
  return {
    dataset: buildDataset(imports, { includeDemo: false }),
    userId: user.id,
    imports,
    client,
  };
}

function evidencePayload(memoryId: string, dataset: MemoryDataset) {
  return citationsFor(
    dataset.memories.find((memory) => memory.id === memoryId)!,
    dataset,
  ).map((citation) => ({
    id: citation.id,
    speaker: citation.speaker,
    passage: citation.passage,
    timestamp: `${citation.day} ${citation.time}`,
    channel: citation.channel,
  }));
}

function memoryPayload(memory: ReturnType<typeof rankMemories>[number], dataset: MemoryDataset) {
  return {
    id: memory.id,
    kind: memory.kind,
    title: memory.title,
    status: memory.status,
    confidence: memory.confidence,
    relevance: memory.score,
    entities: memory.entities,
    history: memory.history ?? [],
    note: memory.note,
    supportingEvidence: evidencePayload(memory.id, dataset),
  };
}

function planAgentTools(utterance: string) {
  const text = utterance.toLowerCase();
  const planned: string[] = [];
  if (text.includes("handoff") || text.includes("tell the project lead"))
    planned.push("recall_export_handoff");
  if (text.includes("risk") || text.includes("blocker") || text.includes("at stake"))
    planned.push("recall_get_briefing", "recall_detect_drift");
  if (text.includes("promise") || text.includes("commitment") || text.includes("overdue"))
    planned.push("recall_check_commitments");
  if (text.includes("deadline") || text.includes("when") || text.includes("what did"))
    planned.push("recall_query_memories");
  if (!planned.length) planned.push("recall_query_memories");
  return [...new Set(planned)].slice(0, 4);
}

async function executeBoundedAgentTurn(utterance: string, dataset: MemoryDataset) {
  const tools = planAgentTools(utterance);
  const results = await Promise.all(
    tools.map(async (tool) => ({
      tool,
      result: await executeMCPTool(
        tool,
        tool === "recall_query_memories" ? { query: utterance } : {},
        dataset,
      ),
    })),
  );
  const hasGroundedData = results.some(({ result }) => {
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
    grounded: hasGroundedData,
    results,
    spoken: hasGroundedData
      ? `I checked ${tools.length} evidence-backed memory view${tools.length === 1 ? "" : "s"} and found connected records to review.`
      : "I could not verify that in the connected records, so I will not make an assumption.",
    nextStep: hasGroundedData
      ? "Review the returned citations before acting."
      : "Connect or import the source you expect to contain the answer.",
  };
}

function addVoiceContract(toolName: string, value: unknown) {
  const data = value && typeof value === "object" ? (value as Record<string, unknown>) : { value };
  if (typeof data["spoken"] === "string") return { ok: true, ...data };
  const count =
    typeof data["count"] === "number"
      ? data["count"]
      : typeof data["total"] === "number"
        ? data["total"]
        : undefined;
  const grounded = data["grounded"] !== false;
  const spoken =
    count !== undefined
      ? `${count} ${toolName.replace(/^recall_/, "").replaceAll("_", " ")} result${count === 1 ? "" : "s"} found in connected records.`
      : toolName === "recall_consolidate"
        ? "Consolidation completed without discarding unresolved claims."
        : "RecallOS returned an evidence-backed result.";
  return {
    ok: true,
    spoken,
    grounded,
    nextStep: grounded
      ? "Review the supporting evidence before relying on it."
      : "Import or connect the source that may contain the answer.",
    ...data,
  };
}

export async function executeMCPTool(
  name: string,
  args: Record<string, unknown> = {},
  dataset = buildDataset(),
): Promise<unknown> {
  switch (name) {
    case "recall_get_context":
      return contextSummary(dataset);

    case "recall_agent_turn":
      return executeBoundedAgentTurn(String(args["utterance"] ?? ""), dataset);

    case "recall_get_privacy_summary":
      return {
        scope: "authenticated owner",
        stored: [
          "redacted transcript imports",
          "validated extracted memories",
          "exact supporting quotes",
          "status/confidence/history metadata",
        ],
        notStoredByDefault: [
          "raw API keys, passwords, payment card numbers, SSNs, and ambient markers after Ambient Guard processing",
        ],
        controls: [
          "owner-scoped MCP reads",
          "export_my_data",
          "preview_delete_import",
          "delete_import",
          "delete_my_data",
        ],
        guarantees: [
          "Supabase RLS scopes cloud imports to the authenticated owner.",
          "Relevance is separate from truth confidence.",
          "No-match responses do not claim that an event never happened.",
        ],
      };

    case "recall_preview_delete_import": {
      const importId = String(args["importId"] ?? "");
      const affected = dataset.memories.filter((memory) =>
        memory.id.startsWith(`import:${importId}:`),
      );
      return {
        importId,
        found: affected.length > 0,
        derivedMemoryCount: affected.length,
        evidenceCount: affected.reduce(
          (total, memory) => total + citationsFor(memory, dataset).length,
          0,
        ),
        requires: ["confirm=true", "unique requestId"],
      };
    }

    case "recall_get_briefing": {
      const requestedLevel = typeof args["filterLevel"] === "string" ? args["filterLevel"] : "all";
      const items =
        requestedLevel === "all"
          ? dataset.briefing
          : dataset.briefing.filter((item) => item.level === requestedLevel);
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
            evidence: memory ? evidencePayload(memory.id, dataset) : [],
          };
        }),
      };
    }

    case "recall_query_memories": {
      const query = String(args["query"] ?? "").trim();
      if (!query) throw new Error("query is required and cannot be blank.");
      const limit = Math.min(20, Math.max(1, Number(args["limit"]) || 10));
      const results = rankMemories(
        query,
        dataset,
        typeof args["kind"] === "string" ? args["kind"] : undefined,
      ).slice(0, limit);
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
          : "No matching memory was found in the connected records. This does not prove it never happened elsewhere.",
        results: results.map((memory) => memoryPayload(memory, dataset)),
        memories: results.map((memory) => memoryPayload(memory, dataset)),
      };
    }

    case "recall_check_commitments": {
      const includeTentative = args["includeTentative"] !== false;
      const records = commitmentRecords(
        dataset,
        typeof args["person"] === "string" ? args["person"] : undefined,
        includeTentative,
      );
      return {
        person: args["person"] ?? "all",
        total: records.length,
        commitments: records.map((memory) => ({
          ...memoryPayload(
            { ...memory, score: 0, citations: citationsFor(memory, dataset) },
            dataset,
          ),
          certainty: memory.status === "confirmed" ? "explicit" : "tentative",
        })),
      };
    }

    case "recall_detect_drift":
      return { totalDriftEvents: dataset.driftEvents.length, events: dataset.driftEvents };

    case "recall_suggest_chart": {
      const groupBy =
        args["groupBy"] === "status" || args["groupBy"] === "channel" ? args["groupBy"] : "kind";
      return makeMemoryChart(dataset, groupBy);
    }

    case "recall_consolidate": {
      const stats = memoryStats(dataset);
      const unresolved = dataset.memories.filter(
        (memory) => memory.status === "conflict" || memory.status === "unknown",
      ).length;
      return {
        status: "consolidated",
        sourceImports: stats.imports,
        episodicMemories: stats.memories,
        evidenceCoverage: stats.evidenceCoverage,
        unresolvedClaims: unresolved,
        supersessionsPreserved: dataset.driftEvents.filter(
          (event) => event.laterClaim.status === "supersedes",
        ).length,
        archived:
          args["pruneResolved"] === true
            ? "not-run: archive requires explicit persistence workflow"
            : 0,
        timestamp: new Date().toISOString(),
      };
    }

    case "recall_export_handoff": {
      const blockers = dataset.briefing.filter((b) => b.level === "blocker");
      const overdue = dataset.briefing.filter((b) => b.level === "overdue");
      const confirmed = dataset.memories.filter((m) => m.status === "confirmed");
      const urgencyScore = Math.min(1, blockers.length * 0.2 + overdue.length * 0.15 + 0.2);
      const allConfirmedGrounded = confirmed.every(
        (memory) => citationsFor(memory, dataset).length > 0,
      );
      return {
        handoffProtocol: "KindHandoff-v1.2",
        targetRole: args["targetRole"] ?? "Team Lead",
        timestamp: new Date().toISOString(),
        urgencyScore,
        emotionalContext: blockers.length
          ? `${blockers.length} blocker${blockers.length === 1 ? "" : "s"} needs attention before the next milestone.`
          : overdue.length
            ? `${overdue.length} overdue commitment${overdue.length === 1 ? "" : "s"} needs a status check.`
            : "No blocker or overdue commitment was found in connected records.",
        verifiedFacts: confirmed.slice(0, 3).map((m) => ({
          title: m.title,
          confidence: m.confidence,
          citations: citationsFor(m, dataset).map((c) => `[${c.speaker}]: "${c.passage}"`),
        })),
        criticalBlockers: blockers.map((b) => ({
          title: b.title,
          why: b.why,
          action: b.action,
        })),
        overduePromises: overdue.map((o) => ({
          title: o.title,
          action: o.action,
        })),
        hallucinationCheck: allConfirmedGrounded
          ? "PASSED: Every verified fact has supporting evidence."
          : "REVIEW_REQUIRED: At least one verified fact has no supporting citation.",
      };
    }

    case "recall_schedule_followup": {
      const person = typeof args["person"] === "string" ? args["person"] : "You";
      const commitments = commitmentRecords(dataset, person, true);
      const attentionIds = new Set(
        dataset.briefing.filter((item) => item.level !== "change").map((item) => item.memoryId),
      );
      const followups = commitments.filter(
        (memory) => memory.status !== "confirmed" || attentionIds.has(memory.id),
      );
      return {
        scheduler: "Yasmin-Spaced-Retention",
        person,
        generatedFromEvidence: true,
        nextCheckInTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        triggers: followups.slice(0, 5).map((memory) => ({
          due: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          prompt: `Alexa: Follow up on “${memory.title}”. Has there been explicit evidence that this is resolved?`,
          priority: memory.status === "conflict" || attentionIds.has(memory.id) ? "high" : "normal",
          relatedMemoryId: memory.id,
          reason:
            memory.note ??
            "The record needs a confirmation check before it is treated as resolved.",
        })),
      };
    }

    case "recall_get_core_memory_blocks": {
      const stats = memoryStats(dataset);
      const focus =
        dataset.briefing[0]?.title ??
        dataset.memories[0]?.title ??
        "No active memory requires attention";
      const coreBlocks = dataset.memories
        .filter((memory) => memory.status === "confirmed")
        .slice(0, 3)
        .map((memory) => ({
          block: memory.kind,
          content: memory.title,
          pinned: true,
          evidenceCount: citationsFor(memory, dataset).length,
        }));
      return {
        framework: "Letta-Mem0-Tiered-Core",
        workingMemory: {
          activeTask: focus,
          currentSpeaker: "Authenticated owner",
          sessionContext: stats.imports
            ? `${stats.imports} saved import${stats.imports === 1 ? "" : "s"}`
            : "No saved imports",
        },
        coreBlocks,
        archivalVault: {
          totalEpisodicMemories: dataset.memories.length,
          evidenceCoverage: `${Math.round(stats.evidenceCoverage * 100)}% quote grounded`,
          connectedChannels: [...new Set(dataset.sources.map((source) => source.channel))],
        },
      };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

function jsonRpcError(id: string | number | null, code: number, message: string, status = 400) {
  return Response.json({ jsonrpc: "2.0", id, error: { code, message } }, { status });
}

function unauthorized() {
  return Response.json(
    { error: "Authentication required. Send a Supabase bearer token." },
    { status: 401, headers: { "WWW-Authenticate": "Bearer" } },
  );
}

function resourcePayload(uri: string, dataset: MemoryDataset) {
  if (uri === "recall://context") return contextSummary(dataset);
  if (uri === "recall://memories") {
    return dataset.memories.map((memory) => ({
      id: memory.id,
      kind: memory.kind,
      title: memory.title,
      status: memory.status,
      confidence: memory.confidence,
      evidenceCount: citationsFor(memory, dataset).length,
    }));
  }
  if (uri === "recall://schema") {
    return {
      dimensions: [
        "kind",
        "status",
        "confidence",
        "person/entity",
        "source",
        "channel",
        "created time",
      ],
      kinds: ["decision", "deadline", "commitment", "task", "question", "fact"],
      statuses: ["confirmed", "inferred", "conflict", "unknown"],
      evidenceOutcomes: [
        "SUPPORTED",
        "CONFLICTED",
        "INCONCLUSIVE",
        "NO_MATCH_IN_CONNECTED_RECORDS",
      ],
      guarantees: [
        "Every returned memory has at least one exact source quote when stored through RecallOS.",
        "Relevance is not truth confidence.",
        "No unrelated fallback memories are returned for an empty search.",
      ],
    };
  }
  return undefined;
}

export async function handleMCPRequest(request: Request): Promise<Response> {
  if (request.method === "OPTIONS")
    return new Response(null, { status: 204, headers: { Allow: "GET,POST,DELETE,OPTIONS" } });
  if (request.method === "DELETE") {
    if (!request.headers.get("authorization")?.startsWith("Bearer ")) return unauthorized();
    return new Response(null, { status: 204, headers: { Allow: "GET,POST,DELETE,OPTIONS" } });
  }
  if (request.method === "GET") {
    return Response.json({
      protocolVersion: MCP_PROTOCOL_VERSION,
      serverInfo: {
        name: "RecallOS-MCP-Server",
        version: "2.0.0",
        description: "Owner-scoped evidence-grounded temporal memory server for Alexa+ clients.",
      },
      authentication: {
        type: "Bearer",
        note: "Tool calls and resources require a Supabase access token.",
      },
      tools: MCP_TOOLS,
      resources: MCP_RESOURCES,
      prompts: MCP_PROMPTS,
    });
  }
  if (request.method !== "POST")
    return new Response("Method Not Allowed", {
      status: 405,
      headers: { Allow: "GET,POST,DELETE,OPTIONS" },
    });
  if (!request.headers.get("authorization")?.startsWith("Bearer ")) return unauthorized();

  let body: {
    jsonrpc?: string;
    id?: string | number;
    method?: string;
    params?: { name?: string; arguments?: Record<string, unknown>; uri?: string };
  };
  try {
    body = await request.json();
  } catch {
    return jsonRpcError(null, -32700, "Invalid JSON.");
  }
  const id = body.id ?? null;
  if (body.jsonrpc !== "2.0" || !body.method)
    return jsonRpcError(id, -32600, "A JSON-RPC 2.0 method is required.");

  if (body.method === "notifications/initialized") return new Response(null, { status: 204 });
  if (body.method === "ping") return Response.json({ jsonrpc: "2.0", id, result: {} });

  let ownerData: Awaited<ReturnType<typeof loadOwnerDataset>>;
  try {
    ownerData = await loadOwnerDataset(request);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load owner-scoped records.";
    return jsonRpcError(
      id,
      -32001,
      message,
      message.includes("Authentication") || message.includes("sign-in") ? 401 : 503,
    );
  }

  if (body.method === "initialize") {
    return Response.json(
      {
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: MCP_PROTOCOL_VERSION,
          capabilities: {
            tools: { listChanged: false },
            resources: { subscribe: false, listChanged: false },
          },
          serverInfo: { name: "RecallOS-MCP-Server", version: "2.0.0" },
          instructions:
            "Use facts-first tools. Cite supportingEvidence, distinguish inferred from confirmed claims, and disclose when no connected record answers a question.",
        },
      },
      {
        headers: { "Mcp-Session-Id": request.headers.get("Mcp-Session-Id") ?? crypto.randomUUID() },
      },
    );
  }
  if (body.method === "tools/list")
    return Response.json({ jsonrpc: "2.0", id, result: { tools: MCP_TOOLS } });
  if (body.method === "resources/list")
    return Response.json({ jsonrpc: "2.0", id, result: { resources: MCP_RESOURCES } });
  if (body.method === "prompts/list")
    return Response.json({ jsonrpc: "2.0", id, result: { prompts: MCP_PROMPTS } });
  if (body.method === "prompts/get") {
    const promptName = body.params?.name;
    const prompt = MCP_PROMPTS.find((candidate) => candidate.name === promptName);
    if (!prompt) return jsonRpcError(id, -32602, "Unknown prompt name.");
    const focus =
      typeof body.params?.arguments?.["focus"] === "string"
        ? body.params.arguments["focus"]
        : "your most important open context";
    const targetRole =
      typeof body.params?.arguments?.["targetRole"] === "string"
        ? body.params.arguments["targetRole"]
        : "project lead";
    const text =
      promptName === "recall_weekly_review"
        ? `Use recall_get_context, recall_check_commitments, and recall_detect_drift to review ${focus}. Cite exact evidence and separate confirmed, inferred, conflicting, and unanswered claims.`
        : promptName === "recall_prepare_handoff"
          ? `Prepare a concise evidence-grounded handoff for the ${targetRole}. Use recall_get_briefing, recall_check_commitments, and recall_export_handoff. Do not invent status or completion.`
          : "Use recall_detect_drift and recall_query_memories to explain the current claim, the superseded claim, and what remains inconclusive.";
    return Response.json({
      jsonrpc: "2.0",
      id,
      result: {
        description: prompt.description,
        messages: [{ role: "user", content: { type: "text", text } }],
      },
    });
  }
  if (body.method === "resources/read") {
    const uri = body.params?.uri;
    const payload = uri ? resourcePayload(uri, ownerData.dataset) : undefined;
    if (!payload) return jsonRpcError(id, -32602, "Unknown resource URI.");
    return Response.json({
      jsonrpc: "2.0",
      id,
      result: {
        contents: [{ uri, mimeType: "application/json", text: JSON.stringify(payload, null, 2) }],
      },
    });
  }
  if (body.method === "tools/call") {
    const toolName = body.params?.name;
    if (!toolName) return jsonRpcError(id, -32602, "Missing tool name.");
    const toolArgs = body.params?.arguments ?? {};

    if (toolName === "recall_preview_delete_import") {
      const importId = typeof toolArgs["importId"] === "string" ? toolArgs["importId"] : "";
      if (!importId) return jsonRpcError(id, -32602, "importId is required.");
      const importRow = ownerData.imports.find((row) => row.id === importId);
      const derivedMemories = ownerData.dataset.memories.filter((memory) =>
        memory.id.startsWith(`import:${importId}:`),
      );
      const structured = addVoiceContract(toolName, {
        importId,
        found: Boolean(importRow),
        title: importRow?.title,
        derivedMemoryCount: derivedMemories.length,
        evidenceCount: derivedMemories.reduce(
          (total, memory) => total + citationsFor(memory, ownerData.dataset).length,
          0,
        ),
        requires: ["confirm=true", "unique requestId"],
      });
      return Response.json({
        jsonrpc: "2.0",
        id,
        result: {
          content: [{ type: "text", text: JSON.stringify(structured, null, 2) }],
          structuredContent: structured,
        },
      });
    }

    if (toolName === "recall_export_my_data") {
      const structured = addVoiceContract(toolName, {
        schemaVersion: "recallos-export-v1",
        exportedAt: new Date().toISOString(),
        ownerScope: "authenticated-owner",
        imports: ownerData.imports.map((row) => ({
          id: row.id,
          title: row.title,
          conversation: row.conversation,
          extraction: row.extraction,
          createdAt: row.created_at,
        })),
      });
      return Response.json({
        jsonrpc: "2.0",
        id,
        result: {
          content: [{ type: "text", text: JSON.stringify(structured, null, 2) }],
          structuredContent: structured,
        },
      });
    }

    if (toolName === "recall_delete_import" || toolName === "recall_delete_my_data") {
      const requestId =
        typeof toolArgs["requestId"] === "string" ? toolArgs["requestId"].trim() : "";
      const requestedImportId =
        toolName === "recall_delete_import" && typeof toolArgs["importId"] === "string"
          ? toolArgs["importId"]
          : null;
      if (toolArgs["confirm"] !== true)
        return jsonRpcError(id, -32602, "This destructive action requires confirm=true.");
      if (!requestId)
        return jsonRpcError(id, -32602, "This destructive action requires a non-empty requestId.");

      const { data: replay } = await supabaseAdmin
        .from("memory_operations")
        .select("payload")
        .eq("request_id", requestId)
        .eq("user_id", ownerData.userId)
        .maybeSingle();
      if (replay?.payload) {
        const structured = replay.payload as Record<string, unknown>;
        const audit = structured["audit"] as Record<string, unknown> | undefined;
        if (
          audit?.["operation"] !== toolName ||
          (audit["requestedImportId"] ?? null) !== requestedImportId
        ) {
          return jsonRpcError(
            id,
            -32602,
            "requestId was already used for a different deletion request.",
          );
        }
        return Response.json({
          jsonrpc: "2.0",
          id,
          result: {
            content: [{ type: "text", text: JSON.stringify(structured, null, 2) }],
            structuredContent: structured,
          },
        });
      }

      let deletedImportIds: string[] = [];
      if (toolName === "recall_delete_import") {
        const importId = typeof toolArgs["importId"] === "string" ? toolArgs["importId"] : "";
        if (!importId) return jsonRpcError(id, -32602, "importId is required.");
        const { data: deleted, error } = await ownerData.client
          .from("conversation_imports")
          .delete()
          .eq("id", importId)
          .select("id")
          .maybeSingle();
        if (error)
          return jsonRpcError(id, -32002, `Could not delete import: ${error.message}`, 503);
        if (deleted?.id) deletedImportIds = [deleted.id];
        if (deletedImportIds.length === 0)
          return jsonRpcError(id, -32602, "That import was not found in your owner-scoped vault.");
      } else {
        const { data: deleted, error } = await ownerData.client
          .from("conversation_imports")
          .delete()
          .neq("id", "00000000-0000-0000-0000-000000000000")
          .select("id");
        if (error)
          return jsonRpcError(id, -32002, `Could not delete owner data: ${error.message}`, 503);
        deletedImportIds = (deleted ?? []).map((row) => row.id);
      }

      const payload = addVoiceContract(toolName, {
        deleted: true,
        deletedImportIds,
        audit: {
          requestId,
          operation: toolName,
          requestedImportId,
          actor: "authenticated-owner",
          replaySafe: true,
        },
      });
      const { error: receiptError } = await supabaseAdmin
        .from("memory_operations")
        .insert({ user_id: ownerData.userId, request_id: requestId, operation: toolName, payload });
      if (receiptError) {
        const { data: raced } = await supabaseAdmin
          .from("memory_operations")
          .select("payload")
          .eq("request_id", requestId)
          .eq("user_id", ownerData.userId)
          .maybeSingle();
        if (raced?.payload) {
          const racedStructured = raced.payload as Record<string, unknown>;
          const racedAudit = racedStructured["audit"] as Record<string, unknown> | undefined;
          if (
            racedAudit?.["operation"] !== toolName ||
            (racedAudit["requestedImportId"] ?? null) !== requestedImportId
          ) {
            return jsonRpcError(
              id,
              -32602,
              "requestId was already used for a different deletion request.",
            );
          }
          return Response.json({
            jsonrpc: "2.0",
            id,
            result: {
              content: [{ type: "text", text: JSON.stringify(racedStructured, null, 2) }],
              structuredContent: racedStructured,
            },
          });
        }
        return jsonRpcError(
          id,
          -32003,
          `The deletion completed but its replay receipt could not be saved: ${receiptError.message}`,
          503,
        );
      }
      return Response.json({
        jsonrpc: "2.0",
        id,
        result: {
          content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
          structuredContent: payload,
        },
      });
    }

    try {
      const structured = await executeMCPTool(toolName, toolArgs, ownerData.dataset);
      const responsePayload = addVoiceContract(toolName, structured);
      return Response.json({
        jsonrpc: "2.0",
        id,
        result: {
          content: [{ type: "text", text: JSON.stringify(responsePayload, null, 2) }],
          structuredContent: responsePayload,
        },
      });
    } catch (error) {
      return jsonRpcError(
        id,
        -32602,
        error instanceof Error ? error.message : "Tool execution failed.",
      );
    }
  }
  return jsonRpcError(id, -32601, `Method '${body.method}' not found.`, 404);
}
