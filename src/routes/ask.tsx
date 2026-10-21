import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { memories, type Memory } from "@/lib/memory";
import { Evidence, MemoryLink, PageHead, StatusPill } from "@/components/ui-bits";

export const Route = createFileRoute("/ask")({
  head: () => ({
    meta: [
      { title: "Ask RecallOS" },
      { name: "description", content: "Ask questions about your past context and see the evidence beside every answer." },
      { property: "og:title", content: "Ask RecallOS" },
      { property: "og:description", content: "Answers grounded in your own records, with sources shown." },
    ],
  }),
  component: Ask,
});

const presets = [
  { q: "When is the demo due?", ids: ["m2"], a: "Sunday 12:00. It was originally Friday 18:00, but Priya said on Tuesday the organisers extended it." },
  { q: "What did I promise?", ids: ["m6", "m7"], a: "One firm promise: share retrieval experiment results by Wednesday (now overdue). You also said you might help with the report — that's tentative, not a commitment." },
  { q: "Why is my project at risk?", ids: ["m1", "m4"], a: "The demo requires API integration to be finished, and Wednesday's standup didn't confirm it's done." },
  { q: "Did anyone fix the auth errors?", ids: ["m3"], a: "I can't confirm. Arjun asked on Tuesday, and I found no reply in your connected records. Someone may have answered elsewhere." },
];

function answerFor(q: string): { a: string; mems: Memory[] } {
  const p = presets.find((x) => x.q.toLowerCase() === q.trim().toLowerCase());
  if (p) return { a: p.a, mems: memories.filter((m) => p.ids.includes(m.id)) };
  const words = q.toLowerCase().split(/\W+/).filter((w) => w.length > 3);
  const mems = memories.filter((m) => words.some((w) => (m.title + m.entities.join(" ")).toLowerCase().includes(w)));
  return mems.length
    ? { a: `I found ${mems.length} related memor${mems.length > 1 ? "ies" : "y"}. Check the evidence below before relying on it.`, mems }
    : { a: "I found nothing about that in your connected records. That doesn't mean it never happened.", mems: [] };
}

function Ask() {
  const [q, setQ] = useState("");
  const [res, setRes] = useState<{ q: string; a: string; mems: Memory[] } | null>(null);
  const run = (text: string) => { if (text.trim()) { setQ(text); setRes({ q: text, ...answerFor(text) }); } };
  return (
    <div>
      <PageHead kicker="Ask RecallOS" title="Ask about anything you've said or heard" />
      <form onSubmit={(e) => { e.preventDefault(); run(q); }} className="flex gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="What did I promise this week?" className="flex-1 rounded-md border bg-card px-4 py-3 outline-none focus:ring-2 focus:ring-ring" />
        <button className="rounded-md bg-primary px-5 font-medium text-primary-foreground hover:opacity-90">Ask</button>
      </form>
      <div className="mt-3 flex flex-wrap gap-2">
        {presets.map((p) => <button key={p.q} onClick={() => run(p.q)} className="rounded-full border px-3 py-1 text-xs text-muted-foreground hover:text-foreground">{p.q}</button>)}
      </div>
      {res && (
        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="rounded-lg border bg-card p-5">
            <div className="font-mono text-xs text-muted-foreground">Q: {res.q}</div>
            <p className="mt-3 text-lg">{res.a}</p>
          </div>
          <aside className="space-y-3">
            <h2 className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Evidence</h2>
            {res.mems.length === 0 && <p className="text-sm text-muted-foreground">No supporting records.</p>}
            {res.mems.map((m) => (
              <div key={m.id} className="space-y-2">
                <div className="flex items-center gap-2"><StatusPill status={m.status} /><MemoryLink id={m.id}>{m.id}</MemoryLink></div>
                {m.sources.map((s) => <Evidence key={s} id={s} />)}
              </div>
            ))}
          </aside>
        </div>
      )}
    </div>
  );
}
