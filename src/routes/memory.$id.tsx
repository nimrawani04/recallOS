import { createFileRoute, notFound } from "@tanstack/react-router";
import { getMemory } from "@/lib/memory";
import { Evidence, PageHead, StatusPill } from "@/components/ui-bits";

export const Route = createFileRoute("/memory/$id")({
  loader: ({ params }) => {
    const m = getMemory(params.id);
    if (!m) throw notFound();
    return m;
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.title ?? "Memory"} — RecallOS` },
      { name: "description", content: "Source passages, history and confidence for this memory." },
      { property: "og:title", content: `${loaderData?.title ?? "Memory"} — RecallOS` },
      { property: "og:description", content: "Evidence and change history behind a RecallOS memory." },
    ],
  }),
  component: MemoryPage,
});

function MemoryPage() {
  const m = Route.useLoaderData();
  return (
    <div>
      <PageHead kicker={`Memory ${m.id} · ${m.kind}`} title={m.title} />
      <div className="mb-6 flex items-center gap-3"><StatusPill status={m.status} /><span className="font-mono text-xs text-muted-foreground">confidence {Math.round(m.confidence * 100)}%</span></div>
      {m.note && <p className="mb-6 rounded-md border bg-card p-4 text-sm">{m.note}</p>}
      <h2 className="mb-3 font-mono text-xs uppercase tracking-wider text-muted-foreground">Supporting evidence</h2>
      <div className="space-y-2">{m.sources.map((s) => <Evidence key={s} id={s} />)}</div>
      {m.history && (
        <>
          <h2 className="mb-3 mt-8 font-mono text-xs uppercase tracking-wider text-muted-foreground">Change history</h2>
          <ol className="border-l pl-5">
            {m.history.map((h, i) => (
              <li key={i} className="relative mb-4">
                <span className={`absolute -left-[26px] top-1.5 h-2.5 w-2.5 rounded-full ${h.current ? "bg-primary" : "bg-muted-foreground"}`} />
                <div className="font-mono text-xs text-muted-foreground">{h.at}</div>
                <div className={h.current ? "" : "text-muted-foreground line-through"}>{h.text}</div>
              </li>
            ))}
          </ol>
        </>
      )}
      <h2 className="mb-2 mt-8 font-mono text-xs uppercase tracking-wider text-muted-foreground">Linked to</h2>
      <div className="flex flex-wrap gap-2">{m.entities.map((e) => <span key={e} className="rounded border px-2 py-1 text-xs">{e}</span>)}</div>
    </div>
  );
}
