import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHead, StatusPill } from "@/components/ui-bits";
import { makeMemoryChart, memoryStats } from "@/lib/memory-engine";
import { useMemoryStore } from "@/lib/memory-store";
import type { Status } from "@/lib/memory";

export const Route = createFileRoute("/insights")({
  head: () => ({
    meta: [
      { title: "Memory insights — RecallOS" },
      {
        name: "description",
        content: "Facts-first memory analytics with deterministic charts and evidence coverage.",
      },
      { property: "og:title", content: "Memory insights — RecallOS" },
      {
        property: "og:description",
        content:
          "Explore memory mix, grounding coverage, and unresolved claims without invented numbers.",
      },
    ],
  }),
  component: Insights,
});

const chartOptions = [
  { key: "kind", label: "By memory type" },
  { key: "status", label: "By certainty status" },
  { key: "channel", label: "By source channel" },
] as const;

function Insights() {
  const { dataset } = useMemoryStore();
  const stats = useMemo(() => memoryStats(dataset), [dataset]);
  const [groupBy, setGroupBy] = useState<(typeof chartOptions)[number]["key"]>("kind");
  const chart = useMemo(() => makeMemoryChart(dataset, groupBy), [dataset, groupBy]);
  const max = Math.max(...chart.data.map((point) => point.value), 1);
  const needsReview = (stats.byStatus["conflict"] ?? 0) + (stats.byStatus["unknown"] ?? 0);
  const healthRows: Array<{ label: string; count: number; status: Status }> = [
    { label: "Confirmed", count: stats.byStatus["confirmed"] ?? 0, status: "confirmed" },
    { label: "Inferred", count: stats.byStatus["inferred"] ?? 0, status: "inferred" },
    { label: "Conflict / unresolved", count: needsReview, status: "conflict" },
  ];

  return (
    <div className="space-y-8">
      <PageHead
        kicker="Facts-first analytics"
        title="See what your memory knows"
        sub="ChartKeep-inspired deterministic facts: every number is computed from verified records, while the assistant remains responsible for explaining the result—not inventing it."
      />

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric
          label="Memories"
          value={stats.memories}
          detail={`${stats.imports} saved import${stats.imports === 1 ? "" : "s"}`}
        />
        <Metric
          label="Evidence coverage"
          value={`${Math.round(stats.evidenceCoverage * 100)}%`}
          detail="records with a source quote"
        />
        <Metric label="Entities" value={stats.entities} detail="people, topics, projects" />
        <Metric
          label="Needs review"
          value={needsReview}
          detail="conflicting or unresolved"
          tone="warning"
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <div className="rounded-xl border bg-card p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                Server-generated chart spec
              </div>
              <h2 className="mt-1 text-xl font-medium">{chart.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{chart.insight}</p>
            </div>
            <span className="rounded border border-confirmed/40 bg-confirmed/10 px-2 py-1 font-mono text-[11px] uppercase text-confirmed">
              facts checked
            </span>
          </div>

          <div className="mt-7 space-y-4" aria-label={chart.title}>
            {chart.data.map((point) => (
              <div
                key={point.label}
                className="grid grid-cols-[120px_1fr_32px] items-center gap-3 text-sm"
              >
                <span className="truncate text-muted-foreground">{point.label}</span>
                <div className="h-3 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${(point.value / max) * 100}%` }}
                  />
                </div>
                <span className="font-mono text-right text-xs">{point.value}</span>
              </div>
            ))}
          </div>
        </div>

        <aside className="rounded-xl border bg-card p-5">
          <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
            Dimension
          </div>
          <div className="mt-3 space-y-2">
            {chartOptions.map((option) => (
              <button
                key={option.key}
                onClick={() => setGroupBy(option.key)}
                className={`w-full rounded-md border px-3 py-2 text-left text-sm transition ${groupBy === option.key ? "border-primary bg-primary/10 text-primary" : "hover:bg-accent"}`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <p className="mt-5 text-xs leading-relaxed text-muted-foreground">
            The same chart spec is available to Alexa+ clients through{" "}
            <code className="text-foreground">recall_suggest_chart</code>.
          </p>
        </aside>
      </section>

      <section className="rounded-xl border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
              Memory health
            </div>
            <h2 className="mt-1 text-xl font-medium">Review before you rely</h2>
          </div>
          <span className="text-xs text-muted-foreground">
            Relevance scores are not truth scores
          </span>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {healthRows.map((row) => (
            <div key={row.label} className="rounded-lg border p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm">{row.label}</span>
                <StatusPill status={row.status} />
              </div>
              <div className="mt-3 font-mono text-2xl">{row.count}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Metric({
  label,
  value,
  detail,
  tone = "default",
}: {
  label: string;
  value: string | number;
  detail: string;
  tone?: "default" | "warning";
}) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div
        className={`mt-2 text-3xl font-semibold ${tone === "warning" ? "text-conflict" : "text-primary"}`}
      >
        {value}
      </div>
      <div className="mt-1 text-xs text-muted-foreground">{detail}</div>
    </div>
  );
}
