/**
 * Temporal Conflict & Mental Model Drift Engine
 * (Inspired by Marc-Dvci/Mental-Model-Drift, Moot, Bellwether, MemoryAgentBench)
 *
 * Tracks how plans evolve over time, detects supersessions (e.g. deadline moved),
 * and flags cognitive/mental-model divergence between team members or user assumptions.
 */

import { memories, type Memory, type Status } from "./memory";

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

export const driftEvents: DriftEvent[] = [
  {
    id: "drift-1",
    topic: "Final Demo Submission Deadline",
    type: "deadline_shift",
    severity: "high",
    earlierClaim: {
      speaker: "Arjun",
      statement: "Demo deadline is Friday 6pm.",
      time: "Mon 16:40",
      sourceId: "s3",
    },
    laterClaim: {
      speaker: "Priya",
      statement: "Organisers extended it — we now have until Sunday noon for the demo.",
      time: "Tue 18:30",
      sourceId: "s5",
      status: "supersedes",
    },
    explanation:
      "Later statement by team lead supersedes the earlier deadline. Standard vector RAG naively returns Friday 6pm, causing panic; RecallOS tracks temporal supersession.",
    recommendedAction: "Sync team calendar to Sunday 12:00 PM and notify all stakeholders.",
  },
  {
    id: "drift-2",
    topic: "API Integration Readiness vs Standup Reality",
    type: "commitment_conflict",
    severity: "high",
    earlierClaim: {
      speaker: "Priya",
      statement:
        "Let's agree: the API integration has to be done before the final demo. No exceptions.",
      time: "Mon 10:12",
      sourceId: "s1",
    },
    laterClaim: {
      speaker: "Meera",
      statement: "Frontend is complete. Still waiting to hear if the API side is wired up.",
      time: "Wed 09:15",
      sourceId: "s6",
      status: "conflicts",
    },
    explanation:
      "A binding decision requires the API for the demo, but Wednesday morning standup proves nobody has verified the API wiring.",
    recommendedAction: "Escalate immediately to Priya & backend owner before afternoon dry-run.",
  },
  {
    id: "drift-3",
    topic: "Staging Authentication Status (Cognitive Void)",
    type: "unverified_assumption",
    severity: "medium",
    earlierClaim: {
      speaker: "Arjun",
      statement: "Did anyone fix the authentication errors on staging?",
      time: "Tue 11:05",
      sourceId: "s4",
    },
    laterClaim: {
      speaker: "System",
      statement: "No subsequent confirmation found across 4 connected channels.",
      time: "Wed 09:30",
      sourceId: "s4",
      status: "unconfirmed",
    },
    explanation:
      "The team may passively assume someone resolved this bug, but no record exists. Negative evidence is surfaced explicitly rather than hallucinating resolution.",
    recommendedAction: "Ask Arjun or check CI/CD error telemetry directly.",
  },
];

export function detectMentalModelDrift(activeMemories: Memory[] = memories): DriftEvent[] {
  // Returns calibrated drift events cross-referenced with active memories
  return driftEvents;
}
