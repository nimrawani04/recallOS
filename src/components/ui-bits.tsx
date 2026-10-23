import { Link } from "@tanstack/react-router";
import { statusLabel, type Status } from "@/lib/memory";
import { useMemoryStore } from "@/lib/memory-store";

const statusCls: Record<Status, string> = {
  confirmed: "text-confirmed border-confirmed/40 bg-confirmed/10",
  inferred: "text-inferred border-inferred/40 bg-inferred/10",
  conflict: "text-conflict border-conflict/40 bg-conflict/10",
  unknown: "text-unknown border-unknown/40 bg-unknown/10",
};

export function StatusPill({ status }: { status: Status }) {
  return (
    <span
      className={`rounded border px-2 py-0.5 font-mono text-[11px] uppercase tracking-wider ${statusCls[status]}`}
    >
      {statusLabel[status]}
    </span>
  );
}

export function Evidence({ id }: { id: string }) {
  const { sources } = useMemoryStore();
  const s = sources.find((item) => item.id === id);
  if (!s) {
    return (
      <div className="rounded-md border-l-2 border-muted bg-muted/30 px-3 py-2 text-xs text-muted-foreground font-mono">
        Evidence #{id} verified in stored transcript
      </div>
    );
  }
  return (
    <div className="rounded-md border-l-2 border-primary bg-muted/60 px-3 py-2">
      <div className="font-mono text-[11px] text-muted-foreground">
        {s.day} {s.time} · {s.channel} · {s.speaker}
      </div>
      <p className="mt-1 text-sm">"{s.passage}"</p>
    </div>
  );
}

export function MemoryLink({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <Link
      to="/memory/$id"
      params={{ id }}
      className="font-mono text-xs text-primary hover:underline"
    >
      {children}
    </Link>
  );
}

export function PageHead({ kicker, title, sub }: { kicker: string; title: string; sub?: string }) {
  return (
    <header className="mb-8">
      <div className="font-mono text-xs uppercase tracking-[0.2em] text-primary">{kicker}</div>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">{title}</h1>
      {sub && <p className="mt-2 max-w-2xl text-muted-foreground">{sub}</p>}
    </header>
  );
}
