import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import type { Briefing, Memory, Source } from "./memory";
import type { DriftEvent } from "./temporal-drift";

export type DriftMetricPoint = {
  day: string;
  divergence: number;
  alignment: number;
  riskLevel: number;
};

export type MemoryBaselineData = {
  sources: Source[];
  memories: Memory[];
  briefing: Briefing[];
  driftEvents: DriftEvent[];
  driftMetrics: DriftMetricPoint[];
};

// Seed baseline constants to provide graceful fallback if database is not yet migrated
const SEED_SOURCES: Source[] = [
  {
    id: "s1",
    day: "Mon",
    time: "10:12",
    channel: "Team call",
    speaker: "Priya",
    passage:
      "Let's agree: the API integration has to be done before the final demo. No exceptions.",
  },
  {
    id: "s2",
    day: "Mon",
    time: "10:20",
    channel: "Team call",
    speaker: "You",
    passage: "I'll run the retrieval experiment and share results by Wednesday.",
  },
  {
    id: "s3",
    day: "Mon",
    time: "16:40",
    channel: "Chat",
    speaker: "Arjun",
    passage: "Demo deadline is Friday 6pm.",
  },
  {
    id: "s4",
    day: "Tue",
    time: "11:05",
    channel: "Chat",
    speaker: "Arjun",
    passage: "Did anyone fix the authentication errors on staging?",
  },
  {
    id: "s5",
    day: "Tue",
    time: "18:30",
    channel: "Team call",
    speaker: "Priya",
    passage: "Organisers extended it — we now have until Sunday noon for the demo.",
  },
  {
    id: "s6",
    day: "Wed",
    time: "09:15",
    channel: "Standup",
    speaker: "Meera",
    passage: "Frontend is complete. Still waiting to hear if the API side is wired up.",
  },
  {
    id: "s7",
    day: "Wed",
    time: "09:18",
    channel: "Standup",
    speaker: "You",
    passage: "Maybe I can look at the report too, not sure yet.",
  },
];

const SEED_MEMORIES: Memory[] = [
  {
    id: "m1",
    kind: "decision",
    title: "API integration must be finished before the final demo",
    status: "confirmed",
    confidence: 0.96,
    sources: ["s1"],
    entities: ["API integration", "Final demo", "Priya"],
  },
  {
    id: "m2",
    kind: "deadline",
    title: "Final demo due Sunday 12:00",
    status: "confirmed",
    confidence: 0.91,
    sources: ["s3", "s5"],
    entities: ["Final demo", "Arjun", "Priya"],
    history: [
      { at: "Mon 16:40", text: "Friday 18:00 (Arjun)" },
      { at: "Tue 18:30", text: "Sunday 12:00 — extended by organisers (Priya)", current: true },
    ],
    note: "Later statement supersedes the earlier one. Both kept in history.",
  },
  {
    id: "m3",
    kind: "question",
    title: "Are the staging authentication errors fixed?",
    status: "unknown",
    confidence: 0.88,
    sources: ["s4"],
    entities: ["Authentication", "Arjun"],
    note: "No answer found in connected records. This does not prove nobody replied elsewhere.",
  },
  {
    id: "m4",
    kind: "task",
    title: "API integration completion",
    status: "conflict",
    confidence: 0.72,
    sources: ["s1", "s6"],
    entities: ["API integration", "Meera"],
    note: "Required by a decision, but the latest update does not confirm completion.",
  },
  {
    id: "m5",
    kind: "task",
    title: "Frontend complete",
    status: "confirmed",
    confidence: 0.93,
    sources: ["s6"],
    entities: ["Frontend", "Meera"],
  },
  {
    id: "m6",
    kind: "commitment",
    title: "You: share retrieval experiment results by Wednesday",
    status: "confirmed",
    confidence: 0.94,
    sources: ["s2"],
    entities: ["Retrieval experiment", "You"],
    note: "Explicit promise. No results shared in connected records — now overdue.",
  },
  {
    id: "m7",
    kind: "commitment",
    title: "You: possibly help with the report",
    status: "inferred",
    confidence: 0.41,
    sources: ["s7"],
    entities: ["Report", "You"],
    note: "Tentative wording ('maybe', 'not sure'). Not treated as a firm promise.",
  },
];

const SEED_BRIEFING: Briefing[] = [
  {
    level: "blocker",
    title: "API integration is not confirmed complete",
    why: "Monday's decision makes it a demo requirement. Wednesday's standup still waits on it.",
    memoryId: "m4",
    action: "Ask Meera & Priya for API status",
  },
  {
    level: "overdue",
    title: "Your retrieval experiment results were due Wednesday",
    why: "You promised this on Monday's call. No results found in connected records.",
    memoryId: "m6",
    action: "Draft a status update",
  },
  {
    level: "followup",
    title: "Authentication question is unanswered",
    why: "Arjun asked on Tuesday. No reply found — search covers connected sources only.",
    memoryId: "m3",
    action: "Reply to Arjun",
  },
  {
    level: "change",
    title: "Demo deadline moved: Friday → Sunday 12:00",
    why: "Tuesday's call superseded Monday's chat message.",
    memoryId: "m2",
    action: "Update reminder",
  },
];

const SEED_DRIFT_EVENTS: DriftEvent[] = [
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

const SEED_DRIFT_METRICS: DriftMetricPoint[] = [
  { day: "Mon 10:00", divergence: 8, alignment: 92, riskLevel: 10 },
  { day: "Mon 17:00", divergence: 22, alignment: 78, riskLevel: 30 },
  { day: "Tue 12:00", divergence: 45, alignment: 55, riskLevel: 58 },
  { day: "Tue 19:00", divergence: 64, alignment: 36, riskLevel: 72 },
  { day: "Wed 09:30", divergence: 78, alignment: 22, riskLevel: 85 },
];

export const fetchMemoryBaseline = createServerFn({ method: "GET" }).handler(
  async (): Promise<MemoryBaselineData> => {
    try {
      const [sourcesRes, memoriesRes, briefingRes, driftEventsRes, driftMetricsRes] =
        await Promise.all([
          supabase.from("memory_sources").select("id,day,time,channel,speaker,passage").order("id"),
          supabase
            .from("memories")
            .select("id,kind,title,status,confidence,sources,entities,history,note")
            .order("id"),
          supabase
            .from("briefing_items")
            .select("id,level,title,why,memory_id,action,sort_order")
            .order("sort_order"),
          supabase
            .from("drift_events")
            .select(
              "id,topic,type,severity,earlier_claim,later_claim,explanation,recommended_action,sort_order",
            )
            .order("sort_order"),
          supabase
            .from("drift_chart_metrics")
            .select("id,day,divergence,alignment,risk_level,sort_order")
            .order("sort_order"),
        ]);

      // If database returned data, map and return it
      const dbSources = (sourcesRes.data ?? []).map((row) => ({
        id: row.id,
        day: row.day,
        time: row.time,
        channel: row.channel,
        speaker: row.speaker,
        passage: row.passage,
      }));

      const dbMemories = (memoriesRes.data ?? []).map((row) => ({
        id: row.id,
        kind: row.kind as Memory["kind"],
        title: row.title,
        status: row.status as Memory["status"],
        confidence: Number(row.confidence),
        sources: Array.isArray(row.sources) ? (row.sources as string[]) : [],
        entities: Array.isArray(row.entities) ? (row.entities as string[]) : [],
        history: Array.isArray(row.history) ? (row.history as Memory["history"]) : undefined,
        note: row.note ?? undefined,
      }));

      const dbBriefing = (briefingRes.data ?? []).map((row) => ({
        level: row.level as Briefing["level"],
        title: row.title,
        why: row.why,
        memoryId: row.memory_id,
        action: row.action,
      }));

      const dbDriftEvents = (driftEventsRes.data ?? []).map((row) => ({
        id: row.id,
        topic: row.topic,
        type: row.type as DriftEvent["type"],
        severity: row.severity as DriftEvent["severity"],
        earlierClaim: row.earlier_claim as DriftEvent["earlierClaim"],
        laterClaim: row.later_claim as DriftEvent["laterClaim"],
        explanation: row.explanation,
        recommendedAction: row.recommended_action,
      }));

      const dbDriftMetrics = (driftMetricsRes.data ?? []).map((row) => ({
        day: row.day,
        divergence: row.divergence,
        alignment: row.alignment,
        riskLevel: row.risk_level,
      }));

      return {
        sources: dbSources.length > 0 ? dbSources : SEED_SOURCES,
        memories: dbMemories.length > 0 ? dbMemories : SEED_MEMORIES,
        briefing: dbBriefing.length > 0 ? dbBriefing : SEED_BRIEFING,
        driftEvents: dbDriftEvents.length > 0 ? dbDriftEvents : SEED_DRIFT_EVENTS,
        driftMetrics: dbDriftMetrics.length > 0 ? dbDriftMetrics : SEED_DRIFT_METRICS,
      };
    } catch (error) {
      console.warn("Failed to load memory baseline from database, using seed baseline:", error);
      return {
        sources: SEED_SOURCES,
        memories: SEED_MEMORIES,
        briefing: SEED_BRIEFING,
        driftEvents: SEED_DRIFT_EVENTS,
        driftMetrics: SEED_DRIFT_METRICS,
      };
    }
  },
);
