import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMemoryStore } from "@/lib/memory-store";
import { MemoryLink, PageHead, StatusPill } from "@/components/ui-bits";

export const Route = createFileRoute("/graph")({
  head: () => ({
    meta: [
      { title: "Temporal GraphRAG — RecallOS" },
      {
        name: "description",
        content:
          "Multi-hop temporal reasoning and entity dependency navigation grounded in evidence.",
      },
    ],
  }),
  component: TemporalGraphRAG,
});

const TIMELINE_DAYS = ["All", "Mon", "Tue", "Wed"] as const;

function TemporalGraphRAG() {
  const { memories, sources, importCount } = useMemoryStore();
  const [selectedDay, setSelectedDay] = useState<(typeof TIMELINE_DAYS)[number]>("All");
  const [sel, setSel] = useState("API integration");
  const [targetHop, setTargetHop] = useState<string>("Final demo");

  // Filter memories by temporal day if selected
  const filteredMemories = useMemo(() => {
    if (selectedDay === "All") return memories;
    const validSourceIds = new Set(
      sources
        .filter((s) => s.day.toLowerCase().startsWith(selectedDay.toLowerCase()))
        .map((s) => s.id),
    );
    return memories.filter((m) => m.sources.some((s) => validSourceIds.has(s)));
  }, [memories, sources, selectedDay]);

  const entities = useMemo(
    () => Array.from(new Set(filteredMemories.flatMap((m) => m.entities))),
    [filteredMemories],
  );

  const W = 640;
  const H = 440;
  const cx = W / 2;
  const cy = H / 2;

  const pos: Record<string, { x: number; y: number }> = useMemo(() => {
    return Object.fromEntries(
      entities.map((e, i) => {
        const a = (i / Math.max(1, entities.length)) * Math.PI * 2;
        return [e, { x: cx + Math.cos(a) * 180, y: cy + Math.sin(a) * 160 }];
      }),
    );
  }, [entities, cx, cy]);

  const edges = useMemo(() => {
    return filteredMemories.flatMap((m) =>
      m.entities.flatMap((a, i) => m.entities.slice(i + 1).map((b) => ({ a, b, m }))),
    );
  }, [filteredMemories]);

  // Multi-hop path tracing from `sel` to `targetHop`
  const multiHopPath = useMemo(() => {
    if (!sel || !targetHop || sel === targetHop) return [];
    // Direct edge
    const direct = edges.find(
      (e) => (e.a === sel && e.b === targetHop) || (e.a === targetHop && e.b === sel),
    );
    if (direct) return [direct];

    // 2-hop search
    for (const e1 of edges) {
      const neighbor = e1.a === sel ? e1.b : e1.b === sel ? e1.a : null;
      if (!neighbor) continue;
      const e2 = edges.find(
        (e) => (e.a === neighbor && e.b === targetHop) || (e.a === targetHop && e.b === neighbor),
      );
      if (e2) return [e1, e2];
    }
    return [];
  }, [sel, targetHop, edges]);

  const isEdgeInPath = (e: { a: string; b: string }) => {
    return multiHopPath.some((p) => (p.a === e.a && p.b === e.b) || (p.a === e.b && p.b === e.a));
  };

  const related = filteredMemories.filter((m) => m.entities.includes(sel));

  return (
    <div className="space-y-8">
      <PageHead
        kicker="ContextIQ GraphRAG & Zenbrain Engine"
        title="Temporal Knowledge Graph & Multi-Hop Reasoning"
        sub="Inspired by ContextIQ GraphRAG and Zenbrain. Explore entity interconnections, track how the mental model evolved chronologically across days, and trace multi-hop dependency paths directly to project risks."
      />

      {/* Temporal Timeline Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
            Temporal Timeline:
          </span>
          <div className="flex rounded-lg border border-border bg-background p-0.5">
            {TIMELINE_DAYS.map((day) => (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`rounded-md px-3 py-1 font-mono text-xs font-medium transition ${
                  selectedDay === day
                    ? "bg-primary text-primary-foreground font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {day}
              </button>
            ))}
          </div>
        </div>

        {/* Multi-hop Path Selector */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          <span className="text-muted-foreground">Trace Path:</span>
          <select
            value={sel}
            onChange={(e) => setSel(e.target.value)}
            className="rounded border border-input bg-background px-2.5 py-1 text-foreground"
          >
            {entities.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
          <span className="text-primary font-bold">➔</span>
          <select
            value={targetHop}
            onChange={(e) => setTargetHop(e.target.value)}
            className="rounded border border-input bg-background px-2.5 py-1 text-foreground"
          >
            {entities.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Multi-Hop Path Status Alert */}
      {multiHopPath.length > 0 && (
        <div className="rounded-lg border border-primary/40 bg-primary/10 p-3 text-xs font-mono">
          <span className="font-bold text-primary">
            Multi-Hop GraphRAG Traversal ({multiHopPath.length} hops):{" "}
          </span>
          <span>
            {sel} ➔ {multiHopPath.map((p) => (p.a === sel ? p.b : p.a)).join(" ➔ ")} ➔ {targetHop}
          </span>
          <div className="mt-1 text-[11px] text-muted-foreground">
            Interconnecting decision: "{multiHopPath[0]!.m.title}"
          </div>
        </div>
      )}

      {/* Main Interactive Visual Graph */}
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="relative">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="w-full rounded-xl border border-border bg-card shadow-sm"
          >
            {/* Edges */}
            {edges.map((e, i) => {
              const on = e.a === sel || e.b === sel;
              const inPath = isEdgeInPath(e);
              const p1 = pos[e.a];
              const p2 = pos[e.b];
              if (!p1 || !p2) return null;

              return (
                <line
                  key={i}
                  x1={p1.x}
                  y1={p1.y}
                  x2={p2.x}
                  y2={p2.y}
                  stroke="currentColor"
                  className={
                    inPath
                      ? "text-primary animate-pulse"
                      : on
                        ? "text-primary/70"
                        : "text-border/60"
                  }
                  strokeWidth={inPath ? 3 : on ? 2 : 1}
                  strokeDasharray={inPath ? "4 2" : undefined}
                />
              );
            })}

            {/* Entity Nodes */}
            {entities.map((e) => {
              const p = pos[e];
              if (!p) return null;
              const isSelected = e === sel;
              const isTarget = e === targetHop;

              return (
                <g
                  key={e}
                  onClick={() => setSel(e)}
                  className="cursor-pointer transition-transform hover:scale-110"
                >
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={isSelected || isTarget ? 10 : 7}
                    fill="currentColor"
                    className={
                      isSelected
                        ? "text-primary shadow-lg"
                        : isTarget
                          ? "text-confirmed"
                          : "text-muted-foreground"
                    }
                  />
                  <text
                    x={p.x}
                    y={p.y - 15}
                    textAnchor="middle"
                    fill="currentColor"
                    className={`text-[12px] font-sans font-medium select-none ${
                      isSelected ? "text-primary font-bold" : "text-foreground"
                    }`}
                  >
                    {e}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Selected Entity Context & Memories */}
        <aside className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div>
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Entity Context
            </span>
            <h2 className="text-xl font-bold text-foreground mt-0.5">{sel}</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Connected to {related.length} memory node{related.length !== 1 ? "s" : ""} in the
              active timeline.
            </p>
          </div>

          <div className="space-y-3">
            {related.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No memories found for {sel} on {selectedDay}.
              </p>
            ) : (
              related.map((m) => (
                <div
                  key={m.id}
                  className="rounded-lg border border-border/80 bg-background/80 p-3 space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[11px] font-semibold uppercase text-muted-foreground">
                      {m.kind}
                    </span>
                    <StatusPill status={m.status} />
                  </div>
                  <div className="text-xs font-medium text-foreground">{m.title}</div>
                  <div className="pt-1 flex items-center justify-between">
                    <span className="font-mono text-[10px] text-muted-foreground">
                      Conf: {Math.round(m.confidence * 100)}%
                    </span>
                    <MemoryLink id={m.id}>Inspect Evidence →</MemoryLink>
                  </div>
                </div>
              ))
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
