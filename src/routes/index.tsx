import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { briefing, getMemory } from "@/lib/memory";
import { Evidence, MemoryLink, PageHead, StatusPill } from "@/components/ui-bits";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Today's briefing — RecallOS" },
      { name: "description", content: "What you missed, what you promised, and what puts your project at risk — with evidence." },
      { property: "og:title", content: "Today's briefing — RecallOS" },
      { property: "og:description", content: "Evidence-backed memory briefing: blockers, overdue promises and changed plans." },
    ],
  }),
  component: Briefing,
});

const levelLabel = { blocker: "Potential blocker", overdue: "Overdue commitment", followup: "Follow-up needed", change: "Plan changed" };
const levelCls = { blocker: "text-conflict", overdue: "text-conflict", followup: "text-primary", change: "text-inferred" };

function Briefing() {
  const [done, setDone] = useState<Record<number, "pending" | "verified">>({});
  return (
    <div>
      <PageHead kicker="Missed-context engine · Wed 09:30" title="What you may have missed" sub="Ranked by risk to your Sunday demo. Every item shows why it's here and the records behind it." />
      <ol className="space-y-4">
        {briefing.map((b, i) => {
          const m = getMemory(b.memoryId)!;
          const st = done[i];
          return (
            <li key={i} className="rounded-lg border bg-card p-5">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-mono text-xs text-muted-foreground">#{i + 1}</span>
                <span className={`font-mono text-xs uppercase tracking-wider ${levelCls[b.level]}`}>{levelLabel[b.level]}</span>
                <StatusPill status={m.status} />
                <span className="ml-auto font-mono text-xs text-muted-foreground">conf {Math.round(m.confidence * 100)}%</span>
              </div>
              <h2 className="mt-3 text-xl font-medium">{b.title}</h2>
              <p className="mt-1 text-muted-foreground">{b.why}</p>
              <div className="mt-4 grid gap-2 md:grid-cols-2">{m.sources.map((s) => <Evidence key={s} id={s} />)}</div>
              <div className="mt-4 flex flex-wrap items-center gap-4">
                <button
                  disabled={!!st}
                  onClick={() => { setDone((d) => ({ ...d, [i]: "pending" })); setTimeout(() => setDone((d) => ({ ...d, [i]: "verified" })), 1400); }}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
                >
                  {st === "pending" ? "Waiting for confirmation…" : st === "verified" ? "✓ Confirmed by service" : b.action}
                </button>
                <MemoryLink id={m.id}>View memory & history →</MemoryLink>
              </div>
            </li>
          );
        })}
      </ol>
      <p className="mt-6 font-mono text-xs text-muted-foreground">Sample data from a three-day project. Search covers connected sources only.</p>
    </div>
  );
}
