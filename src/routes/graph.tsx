import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { memories } from "@/lib/memory";
import { MemoryLink, PageHead, StatusPill } from "@/components/ui-bits";

export const Route = createFileRoute("/graph")({
  head: () => ({
    meta: [
      { title: "Memory graph — RecallOS" },
      { name: "description", content: "People, projects, decisions and tasks linked across time." },
      { property: "og:title", content: "Memory graph — RecallOS" },
      { property: "og:description", content: "Explore how people, decisions and tasks connect over time." },
    ],
  }),
  component: Graph,
});

function Graph() {
  const entities = useMemo(() => Array.from(new Set(memories.flatMap((m) => m.entities))), []);
  const [sel, setSel] = useState("API integration");
  const W = 640, H = 420, cx = W / 2, cy = H / 2;
  const pos = Object.fromEntries(entities.map((e, i) => {
    const a = (i / entities.length) * Math.PI * 2;
    return [e, { x: cx + Math.cos(a) * 170, y: cy + Math.sin(a) * 160 }];
  }));
  const edges = memories.flatMap((m) => m.entities.flatMap((a, i) => m.entities.slice(i + 1).map((b) => ({ a, b, m }))));
  const related = memories.filter((m) => m.entities.includes(sel));
  return (
    <div>
      <PageHead kicker="Temporal memory graph" title="How things connect" sub="Click a node to see the memories behind it." />
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-lg border bg-card">
          {edges.map((e, i) => {
            const on = e.a === sel || e.b === sel;
            return <line key={i} x1={pos[e.a].x} y1={pos[e.a].y} x2={pos[e.b].x} y2={pos[e.b].y} stroke="currentColor" className={on ? "text-primary" : "text-border"} strokeWidth={on ? 1.6 : 1} />;
          })}
          {entities.map((e) => (
            <g key={e} onClick={() => setSel(e)} className="cursor-pointer">
              <circle cx={pos[e].x} cy={pos[e].y} r={e === sel ? 9 : 6} fill="currentColor" className={e === sel ? "text-primary" : "text-muted-foreground"} />
              <text x={pos[e].x} y={pos[e].y - 14} textAnchor="middle" fill="currentColor" className="text-foreground text-[12px]">{e}</text>
            </g>
          ))}
        </svg>
        <aside>
          <h2 className="text-lg font-medium">{sel}</h2>
          <ul className="mt-3 space-y-3">
            {related.map((m) => (
              <li key={m.id} className="rounded-md border bg-card p-3">
                <div className="flex items-center justify-between gap-2"><span className="font-mono text-[11px] text-muted-foreground">{m.kind}</span><StatusPill status={m.status} /></div>
                <div className="mt-1 text-sm">{m.title}</div>
                <div className="mt-2"><MemoryLink id={m.id}>Open →</MemoryLink></div>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  );
}
