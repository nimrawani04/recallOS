import { type Briefing, type Memory, type Source } from "./memory";
import { type DriftEvent } from "./temporal-drift";

export type BaselineMemoryData = {
  memories?: Memory[];
  sources?: Source[];
  briefing?: Briefing[];
  driftEvents?: DriftEvent[];
};

export type StoredImport = {
  id: string;
  title: string;
  conversation: string;
  extraction: {
    memories: Array<{
      kind: "decision" | "commitment" | "question" | "fact" | "deadline";
      title: string;
      person: string | null;
      deadline: string | null;
      certainty: "explicit" | "tentative" | "inferred";
      quote: string;
    }>;
    people: Array<{ name: string; quote: string }>;
  };
  created_at: string;
};

export type MemoryDataset = {
  memories: Memory[];
  sources: Source[];
  briefing: Briefing[];
  driftEvents: DriftEvent[];
  importCount: number;
};

export type RankedMemory = Memory & {
  score: number;
  citations: Citation[];
};

export type Citation = Source & { memoryId: string };

export type ChartSpec = {
  type: "bar" | "line" | "pie";
  title: string;
  xKey: "label";
  yKey: "value";
  data: Array<{ label: string; value: number }>;
  factsChecked: true;
  insight: string;
};

const STOP_WORDS = new Set([
  "about",
  "after",
  "again",
  "also",
  "been",
  "does",
  "from",
  "have",
  "into",
  "that",
  "the",
  "this",
  "what",
  "when",
  "where",
  "which",
  "with",
  "your",
  "team",
]);

function words(value: string) {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word));
}

function sourceForMemory(memory: Memory, sources: Source[]): Citation[] {
  return memory.sources
    .map((id) => sources.find((source) => source.id === id))
    .filter((source): source is Source => Boolean(source))
    .map((source) => ({ ...source, memoryId: memory.id }));
}

function importedMemory(
  item: StoredImport["extraction"]["memories"][number],
  importRow: StoredImport,
  index: number,
): { memory: Memory; source: Source } {
  const id = `import:${importRow.id}:${index}`;
  const sourceId = `${id}:evidence`;
  const timestamp = new Date(importRow.created_at);
  const dateLabel = Number.isNaN(timestamp.getTime())
    ? importRow.created_at
    : timestamp.toISOString();
  const status =
    item.kind === "question" ? "unknown" : item.certainty === "explicit" ? "confirmed" : "inferred";
  const confidence =
    item.certainty === "explicit" ? 0.9 : item.certainty === "tentative" ? 0.55 : 0.68;

  return {
    memory: {
      id,
      kind: item.kind,
      title: item.title,
      status,
      confidence,
      sources: [sourceId],
      entities: [item.person, ...(item.deadline ? [item.deadline] : [])].filter(
        (value): value is string => Boolean(value),
      ),
      note: `${item.certainty} claim from ${importRow.title}${item.deadline ? ` · stated deadline: ${item.deadline}` : ""}`,
    },
    source: {
      id: sourceId,
      day: "Imported",
      time: dateLabel,
      channel: "Saved transcript",
      speaker: item.person ?? "Unknown speaker",
      passage: item.quote,
    },
  };
}

export function buildDataset(
  imports: StoredImport[] = [],
  baselineOrOptions?: BaselineMemoryData | { includeDemo?: boolean },
): MemoryDataset {
  const imported = imports.flatMap((row) =>
    row.extraction.memories.map((item, index) => importedMemory(item, row, index)),
  );
  const baseline: BaselineMemoryData =
    baselineOrOptions && !("includeDemo" in baselineOrOptions)
      ? (baselineOrOptions as BaselineMemoryData)
      : {};

  const baselineMemories = baseline.memories ?? [];
  const baselineSources = baseline.sources ?? [];
  const baselineBriefing = baseline.briefing ?? [];
  const baselineDriftEvents = baseline.driftEvents ?? [];

  const memories = [...baselineMemories, ...imported.map((item) => item.memory)];
  const sources = [...baselineSources, ...imported.map((item) => item.source)];
  const importedBriefing: Briefing[] = imported.flatMap(({ memory }) => {
    if (memory.kind === "question") {
      return [
        {
          level: "followup",
          title: `Unanswered: ${memory.title}`,
          why: memory.note ?? "No answer has been verified in the saved transcript.",
          memoryId: memory.id,
          action: "Review the source transcript",
        },
      ];
    }
    if (memory.status === "inferred") {
      return [
        {
          level: "followup",
          title: `Review inferred memory: ${memory.title}`,
          why: "This claim was tentative or inferred. RecallOS will not treat it as a firm commitment without confirmation.",
          memoryId: memory.id,
          action: "Confirm or dismiss",
        },
      ];
    }
    return [];
  });

  return {
    memories,
    sources,
    briefing: [...baselineBriefing, ...importedBriefing],
    driftEvents: baselineDriftEvents,
    importCount: imports.length,
  };
}

export function citationsFor(memory: Memory, dataset: MemoryDataset): Citation[] {
  return sourceForMemory(memory, dataset.sources);
}

export function rankMemories(query: string, dataset: MemoryDataset, kind?: string): RankedMemory[] {
  const queryWords = words(query);
  const phrase = query.trim().toLowerCase();

  return dataset.memories
    .filter((memory) => !kind || kind === "all" || memory.kind === kind)
    .map((memory) => {
      const citations = citationsFor(memory, dataset);
      const haystack =
        `${memory.title} ${memory.entities.join(" ")} ${memory.note ?? ""} ${citations.map((citation) => citation.passage).join(" ")}`.toLowerCase();
      const matchedWords = queryWords.filter((word) => haystack.includes(word));
      const phraseBoost = phrase.length > 2 && haystack.includes(phrase) ? 2 : 0;
      return { memory, citations, score: matchedWords.length + phraseBoost };
    })
    .filter((item) => queryWords.length === 0 || item.score > 0)
    .sort(
      (left, right) => right.score - left.score || right.memory.confidence - left.memory.confidence,
    )
    .map(({ memory, citations, score }) => ({ ...memory, score, citations }));
}

export function commitmentRecords(
  dataset: MemoryDataset,
  person?: string,
  includeTentative = true,
) {
  const target = person?.toLowerCase();
  return dataset.memories.filter((memory) => {
    if (memory.kind !== "commitment" && memory.kind !== "task" && memory.kind !== "deadline")
      return false;
    if (!includeTentative && memory.status !== "confirmed") return false;
    if (!target) return true;
    return (
      memory.title.toLowerCase().includes(target) ||
      memory.entities.some((entity) => entity.toLowerCase().includes(target))
    );
  });
}

export function memoryStats(dataset: MemoryDataset) {
  const byKind = dataset.memories.reduce<Record<string, number>>((counts, memory) => {
    counts[memory.kind] = (counts[memory.kind] ?? 0) + 1;
    return counts;
  }, {});
  const byStatus = dataset.memories.reduce<Record<string, number>>((counts, memory) => {
    counts[memory.status] = (counts[memory.status] ?? 0) + 1;
    return counts;
  }, {});
  const evidenceBacked = dataset.memories.filter(
    (memory) => citationsFor(memory, dataset).length > 0,
  ).length;

  return {
    memories: dataset.memories.length,
    evidenceBacked,
    evidenceCoverage: dataset.memories.length ? evidenceBacked / dataset.memories.length : 0,
    imports: dataset.importCount,
    entities: new Set(dataset.memories.flatMap((memory) => memory.entities)).size,
    byKind,
    byStatus,
  };
}

export function makeMemoryChart(
  dataset: MemoryDataset,
  groupBy: "kind" | "status" | "channel" = "kind",
): ChartSpec {
  const counts = new Map<string, number>();
  for (const memory of dataset.memories) {
    const labels =
      groupBy === "kind"
        ? [memory.kind]
        : groupBy === "status"
          ? [memory.status]
          : citationsFor(memory, dataset).map((citation) => citation.channel);
    for (const label of labels) counts.set(label, (counts.get(label) ?? 0) + 1);
  }

  const data = [...counts.entries()]
    .sort((left, right) => right[1] - left[1])
    .map(([label, value]) => ({ label, value }));
  const largest = data[0];
  const groupLabel = groupBy === "kind" ? "memory type" : groupBy;

  return {
    type: groupBy === "channel" ? "pie" : "bar",
    title: `Memories by ${groupLabel}`,
    xKey: "label",
    yKey: "value",
    data,
    factsChecked: true,
    insight: largest
      ? `${largest.label} is the largest ${groupLabel}, with ${largest.value} ${largest.value === 1 ? "memory" : "memories"}.`
      : "No memories are available for this chart.",
  };
}

export function contextSummary(dataset: MemoryDataset, now = new Date()) {
  const stats = memoryStats(dataset);
  const unresolved = dataset.memories.filter(
    (memory) => memory.status === "conflict" || memory.status === "unknown",
  );
  const commitments = commitmentRecords(dataset, "You", false);

  return {
    generatedAt: now.toISOString(),
    imports: stats.imports,
    memoryCount: stats.memories,
    evidenceCoverage: stats.evidenceCoverage,
    unresolvedCount: unresolved.length,
    unresolved: unresolved
      .slice(0, 5)
      .map((memory) => ({ id: memory.id, title: memory.title, status: memory.status })),
    personalCommitments: commitments.slice(0, 5).map((memory) => ({
      id: memory.id,
      title: memory.title,
      status: memory.status,
      confidence: memory.confidence,
    })),
    nextActions: dataset.briefing
      .slice(0, 5)
      .map((item) => ({ title: item.title, action: item.action, level: item.level })),
  };
}
