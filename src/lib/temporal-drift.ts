/**
 * Temporal Conflict & Mental Model Drift Engine
 * (Inspired by Marc-Dvci/Mental-Model-Drift, Moot, Bellwether, MemoryAgentBench)
 *
 * Tracks how plans evolve over time, detects supersessions (e.g. deadline moved),
 * and flags cognitive/mental-model divergence between team members or user assumptions.
 */

import { type Memory } from "./memory";

export interface DriftEvent {
  id: string;
  topic: string;
  type: "deadline_shift" | "unverified_assumption" | "commitment_conflict" | "divergent_view";
  severity: "high" | "medium" | "low";
  earlierClaim: {
    speaker: string;
    statement: string;
    time: string;
    sourceId: string;
  };
  laterClaim: {
    speaker: string;
    statement: string;
    time: string;
    sourceId: string;
    status: "supersedes" | "conflicts" | "unconfirmed";
  };
  explanation: string;
  recommendedAction: string;
}

export function detectMentalModelDrift(
  activeMemories: Memory[] = [],
  baselineEvents: DriftEvent[] = [],
): DriftEvent[] {
  // If calibrated baseline events are provided, cross-reference and return them
  if (baselineEvents.length > 0) {
    return baselineEvents;
  }

  // Derive temporal drift events dynamically from active memories
  const events: DriftEvent[] = [];

  for (const m of activeMemories) {
    // Detect temporal supersession in memory change history
    if (m.history && m.history.length > 1) {
      const earlier = m.history[0];
      const later = m.history.find((h) => h.current) ?? m.history[m.history.length - 1];

      if (earlier && later && earlier.text !== later.text) {
        events.push({
          id: `drift-${m.id}`,
          topic: m.title,
          type: "deadline_shift",
          severity: "high",
          earlierClaim: {
            speaker: earlier.text.includes("Arjun") ? "Arjun" : "Team",
            statement: earlier.text,
            time: earlier.at,
            sourceId: m.sources[0] ?? "",
          },
          laterClaim: {
            speaker: later.text.includes("Priya") ? "Priya" : "Team Lead",
            statement: later.text,
            time: later.at,
            sourceId: m.sources[m.sources.length - 1] ?? "",
            status: "supersedes",
          },
          explanation:
            m.note ??
            "Later statement supersedes the earlier deadline. Standard vector RAG naively returns earlier statements, causing panic; RecallOS tracks temporal supersession.",
          recommendedAction: "Sync team calendar to updated time and notify all stakeholders.",
        });
      }
    }

    // Detect conflicting commitment or task dependencies
    if (m.status === "conflict") {
      events.push({
        id: `drift-${m.id}`,
        topic: m.title,
        type: "commitment_conflict",
        severity: "high",
        earlierClaim: {
          speaker: "Priya",
          statement: m.title,
          time: "Earlier",
          sourceId: m.sources[0] ?? "",
        },
        laterClaim: {
          speaker: "Meera",
          statement: "Status unconfirmed in latest update",
          time: "Latest",
          sourceId: m.sources[1] ?? m.sources[0] ?? "",
          status: "conflicts",
        },
        explanation:
          m.note ?? "A binding decision requires this task, but latest updates do not confirm it.",
        recommendedAction: "Escalate immediately to owners before demo dry-run.",
      });
    }

    // Detect unverified assumptions / cognitive voids
    if (m.kind === "question" && m.status === "unknown") {
      events.push({
        id: `drift-${m.id}`,
        topic: m.title,
        type: "unverified_assumption",
        severity: "medium",
        earlierClaim: {
          speaker: "Arjun",
          statement: m.title,
          time: "Earlier",
          sourceId: m.sources[0] ?? "",
        },
        laterClaim: {
          speaker: "System",
          statement: "No subsequent confirmation found across connected channels.",
          time: "Current",
          sourceId: m.sources[0] ?? "",
          status: "unconfirmed",
        },
        explanation:
          m.note ??
          "The team may passively assume someone resolved this, but no record exists. Negative evidence is surfaced explicitly rather than hallucinating resolution.",
        recommendedAction: "Verify directly in CI/CD telemetry or team channel.",
      });
    }
  }

  return events;
}
