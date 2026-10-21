export type Status = "confirmed" | "inferred" | "conflict" | "unknown";

export type Source = {
  id: string;
  day: string;
  time: string;
  channel: string;
  speaker: string;
  passage: string;
};

export type Memory = {
  id: string;
  kind: "decision" | "question" | "task" | "deadline" | "commitment";
  title: string;
  status: Status;
  confidence: number;
  sources: string[];
  entities: string[];
  history?: { at: string; text: string; current?: boolean }[];
  note?: string;
};

export const sources: Source[] = [
  { id: "s1", day: "Mon", time: "10:12", channel: "Team call", speaker: "Priya", passage: "Let's agree: the API integration has to be done before the final demo. No exceptions." },
  { id: "s2", day: "Mon", time: "10:20", channel: "Team call", speaker: "You", passage: "I'll run the retrieval experiment and share results by Wednesday." },
  { id: "s3", day: "Mon", time: "16:40", channel: "Chat", speaker: "Arjun", passage: "Demo deadline is Friday 6pm." },
  { id: "s4", day: "Tue", time: "11:05", channel: "Chat", speaker: "Arjun", passage: "Did anyone fix the authentication errors on staging?" },
  { id: "s5", day: "Tue", time: "18:30", channel: "Team call", speaker: "Priya", passage: "Organisers extended it — we now have until Sunday noon for the demo." },
  { id: "s6", day: "Wed", time: "09:15", channel: "Standup", speaker: "Meera", passage: "Frontend is complete. Still waiting to hear if the API side is wired up." },
  { id: "s7", day: "Wed", time: "09:18", channel: "Standup", speaker: "You", passage: "Maybe I can look at the report too, not sure yet." },
];

export const memories: Memory[] = [
  { id: "m1", kind: "decision", title: "API integration must be finished before the final demo", status: "confirmed", confidence: 0.96, sources: ["s1"], entities: ["API integration", "Final demo", "Priya"] },
  { id: "m2", kind: "deadline", title: "Final demo due Sunday 12:00", status: "confirmed", confidence: 0.91, sources: ["s3", "s5"], entities: ["Final demo", "Arjun", "Priya"],
    history: [ { at: "Mon 16:40", text: "Friday 18:00 (Arjun)" }, { at: "Tue 18:30", text: "Sunday 12:00 — extended by organisers (Priya)", current: true } ],
    note: "Later statement supersedes the earlier one. Both kept in history." },
  { id: "m3", kind: "question", title: "Are the staging authentication errors fixed?", status: "unknown", confidence: 0.88, sources: ["s4"], entities: ["Authentication", "Arjun"],
    note: "No answer found in connected records. This does not prove nobody replied elsewhere." },
  { id: "m4", kind: "task", title: "API integration completion", status: "conflict", confidence: 0.72, sources: ["s1", "s6"], entities: ["API integration", "Meera"],
    note: "Required by a decision, but the latest update does not confirm completion." },
  { id: "m5", kind: "task", title: "Frontend complete", status: "confirmed", confidence: 0.93, sources: ["s6"], entities: ["Frontend", "Meera"] },
  { id: "m6", kind: "commitment", title: "You: share retrieval experiment results by Wednesday", status: "confirmed", confidence: 0.94, sources: ["s2"], entities: ["Retrieval experiment", "You"],
    note: "Explicit promise. No results shared in connected records — now overdue." },
  { id: "m7", kind: "commitment", title: "You: possibly help with the report", status: "inferred", confidence: 0.41, sources: ["s7"], entities: ["Report", "You"],
    note: "Tentative wording ('maybe', 'not sure'). Not treated as a firm promise." },
];

export const getSource = (id: string) => sources.find((s) => s.id === id)!;
export const getMemory = (id: string) => memories.find((m) => m.id === id);

export type Briefing = { level: "blocker" | "overdue" | "followup" | "change"; title: string; why: string; memoryId: string; action: string };

export const briefing: Briefing[] = [
  { level: "blocker", title: "API integration is not confirmed complete", why: "Monday's decision makes it a demo requirement. Wednesday's standup still waits on it.", memoryId: "m4", action: "Ask Meera & Priya for API status" },
  { level: "overdue", title: "Your retrieval experiment results were due Wednesday", why: "You promised this on Monday's call. No results found in connected records.", memoryId: "m6", action: "Draft a status update" },
  { level: "followup", title: "Authentication question is unanswered", why: "Arjun asked on Tuesday. No reply found — search covers connected sources only.", memoryId: "m3", action: "Reply to Arjun" },
  { level: "change", title: "Demo deadline moved: Friday → Sunday 12:00", why: "Tuesday's call superseded Monday's chat message.", memoryId: "m2", action: "Update reminder" },
];

export const statusLabel: Record<Status, string> = { confirmed: "Confirmed", inferred: "Inferred", conflict: "Conflicting", unknown: "Unresolved" };
