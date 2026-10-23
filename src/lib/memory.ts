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
  kind: "decision" | "question" | "task" | "deadline" | "commitment" | "fact";
  title: string;
  status: Status;
  confidence: number;
  sources: string[];
  entities: string[];
  history?: { at: string; text: string; current?: boolean }[] | undefined;
  note?: string | undefined;
};

export type Briefing = {
  level: "blocker" | "overdue" | "followup" | "change";
  title: string;
  why: string;
  memoryId: string;
  action: string;
};

export const statusLabel: Record<Status, string> = {
  confirmed: "Confirmed",
  inferred: "Inferred",
  conflict: "Conflicting",
  unknown: "Unresolved",
};
