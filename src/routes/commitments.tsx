import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMemoryStore } from "@/lib/memory-store";
import { MemoryLink, PageHead, StatusPill } from "@/components/ui-bits";

export const Route = createFileRoute("/commitments")({
  head: () => ({
    meta: [
      { title: "Commitments — RecallOS" },
      {
        name: "description",
        content: "Promises, tasks and deadlines with ownership and confirmation status.",
      },
      { property: "og:title", content: "Commitments — RecallOS" },
      {
        property: "og:description",
        content: "Track promises, tasks and deadlines with explicit confirmation states.",
      },
    ],
  }),
  component: Commitments,
});

function Commitments() {
  const { memories, importCount } = useMemoryStore();
  const rows = memories.filter((m) => m.kind !== "question");
  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  return (
    <div>
      <PageHead
        kicker="Commitments"
        title="Promises, tasks & deadlines"
        sub="Firm promises are separated from tentative ones. Mark complete only when it's really done."
      />
      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted font-mono text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="p-3 text-left">Item</th>
              <th className="p-3 text-left">Type</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-left">Conf.</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => (
              <tr key={m.id} className="border-t bg-card">
                <td className="p-3">
                  <div className={completed[m.id] ? "line-through text-muted-foreground" : ""}>
                    {m.title}
                  </div>
                  {m.note && <div className="mt-1 text-xs text-muted-foreground">{m.note}</div>}
                </td>
                <td className="p-3 font-mono text-xs">{m.kind}</td>
                <td className="p-3">
                  <StatusPill status={m.status} />
                </td>
                <td className="p-3 font-mono text-xs">{Math.round(m.confidence * 100)}%</td>
                <td className="p-3 text-right whitespace-nowrap">
                  <button
                    onClick={() => setCompleted((c) => ({ ...c, [m.id]: !c[m.id] }))}
                    className="mr-3 rounded border px-2 py-1 text-xs hover:bg-accent"
                  >
                    {completed[m.id] ? "Undo" : "Mark done"}
                  </button>
                  <MemoryLink id={m.id}>Evidence</MemoryLink>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
