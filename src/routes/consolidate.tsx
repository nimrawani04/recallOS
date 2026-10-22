import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHead, StatusPill } from "@/components/ui-bits";
import { driftEvents } from "@/lib/temporal-drift";

export const Route = createFileRoute("/consolidate")({
  head: () => ({
    meta: [
      { title: "Memory Consolidation (Machine Dream) — RecallOS" },
      {
        name: "description",
        content: "Offline memory consolidation, conflict reconciliation and knowledge synthesis.",
      },
    ],
  }),
  component: ConsolidateStudio,
});

interface ConsolidationStep {
  step: string;
  detail: string;
  status: "done" | "in_progress" | "pending";
}

function ConsolidateStudio() {
  const [isRunning, setIsRunning] = useState(false);
  const [hasCompleted, setHasCompleted] = useState(false);
  const [activeTab, setActiveTab] = useState<"pipeline" | "drift" | "clusters">("pipeline");

  const [steps, setSteps] = useState<ConsolidationStep[]>([
    {
      step: "Episodic Ingestion & Ambient Guard Audit",
      detail: "Scanning 7 raw transcript passages across team calls, chat, and standups.",
      status: "pending",
    },
    {
      step: "Temporal Supersession Resolution",
      detail: "Linking Friday 18:00 (Arjun) to superseded status by Sunday 12:00 (Priya).",
      status: "pending",
    },
    {
      step: "Commitment Calibration & Certainty Weighting",
      detail: "Isolating firm promise (Retrieval experiment) from tentative remark (Report help).",
      status: "pending",
    },
    {
      step: "Knowledge Graph Entity Merging",
      detail:
        "Connecting API Integration, Final Demo, Meera, Priya, and Arjun into cohesive graph.",
      status: "pending",
    },
    {
      step: "Sleep-Phase Dream Synthesis",
      detail: "Compiling executive briefing notes and archiving redundant episodic noise.",
      status: "pending",
    },
  ]);

  const runConsolidation = async () => {
    setIsRunning(true);
    setHasCompleted(false);

    for (let i = 0; i < steps.length; i++) {
      setSteps((prev) =>
        prev.map((s, idx) =>
          idx === i ? { ...s, status: "in_progress" } : idx < i ? { ...s, status: "done" } : s,
        ),
      );
      await new Promise((r) => setTimeout(r, 600));
    }

    setSteps((prev) => prev.map((s) => ({ ...s, status: "done" })));
    setIsRunning(false);
    setHasCompleted(true);
  };

  return (
    <div className="space-y-8">
      <PageHead
        kicker="Machine Dream & A-MEM Synthesis"
        title="Offline Memory Consolidation Engine"
        sub="Inspired by human REM sleep and offline memory consolidation (Machine Dream & A-MEM). Periodically synthesizes episodic conversational chatter into clean, durable semantic knowledge graphs with temporal conflicts resolved."
      />

      {/* Control Banner */}
      <div className="rounded-xl border border-border bg-gradient-to-r from-card to-card/50 p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="font-semibold text-base">
            Consolidation Status: {hasCompleted ? "Synchronized" : "Pending Cycle"}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {hasCompleted
              ? "7 episodic memories consolidated into 6 unified entity nodes. 1 supersession confirmed."
              : "Consolidation cycle recommended: 1 unresolved deadline conflict and 1 unconfirmed task."}
          </p>
        </div>

        <button
          onClick={runConsolidation}
          disabled={isRunning}
          className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
        >
          {isRunning ? "Consolidating Memory Vault..." : "⚡ Run Machine Dream Consolidation"}
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-border text-sm font-medium">
        <button
          onClick={() => setActiveTab("pipeline")}
          className={`pb-3 px-4 border-b-2 font-mono text-xs uppercase tracking-wider transition ${
            activeTab === "pipeline"
              ? "border-primary text-primary font-bold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Consolidation Pipeline
        </button>
        <button
          onClick={() => setActiveTab("drift")}
          className={`pb-3 px-4 border-b-2 font-mono text-xs uppercase tracking-wider transition ${
            activeTab === "drift"
              ? "border-primary text-primary font-bold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Mental Model Drift ({driftEvents.length})
        </button>
      </div>

      {/* Pipeline View */}
      {activeTab === "pipeline" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="font-mono text-xs uppercase tracking-wider text-muted-foreground mb-4">
              Step-by-step Synthesis Phases:
            </h3>

            <div className="space-y-4">
              {steps.map((st, i) => (
                <div key={i} className="flex items-start gap-4">
                  <div
                    className={`mt-0.5 flex h-6 w-6 items-center justify-center rounded-full font-mono text-xs font-bold ${
                      st.status === "done"
                        ? "bg-confirmed text-background"
                        : st.status === "in_progress"
                          ? "animate-pulse bg-primary text-background"
                          : "border border-border text-muted-foreground"
                    }`}
                  >
                    {st.status === "done" ? "✓" : i + 1}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-foreground">{st.step}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{st.detail}</div>
                  </div>
                  <span
                    className={`font-mono text-[11px] uppercase ${
                      st.status === "done"
                        ? "text-confirmed"
                        : st.status === "in_progress"
                          ? "text-primary"
                          : "text-muted-foreground"
                    }`}
                  >
                    {st.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Mental Model Drift View */}
      {activeTab === "drift" && (
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Mental model drift occurs when assumptions between team members or earlier decisions
            diverge from reality. RecallOS tracks exact temporal diffs.
          </p>

          <div className="grid gap-4">
            {driftEvents.map((d) => (
              <div key={d.id} className="rounded-xl border border-border bg-card p-5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-primary">{d.topic}</span>
                    <span
                      className={`rounded px-2 py-0.5 font-mono text-[10px] uppercase font-semibold ${
                        d.severity === "high"
                          ? "bg-conflict/20 text-conflict"
                          : "bg-inferred/20 text-inferred"
                      }`}
                    >
                      {d.severity} priority drift
                    </span>
                  </div>
                  <span className="font-mono text-[11px] text-muted-foreground uppercase">
                    {d.type}
                  </span>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  {/* Earlier Statement */}
                  <div className="rounded border border-border/80 bg-muted/40 p-3 space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                      <span>Earlier: {d.earlierClaim.time}</span>
                      <span>Speaker: {d.earlierClaim.speaker}</span>
                    </div>
                    <p className="text-xs font-medium text-foreground">
                      "{d.earlierClaim.statement}"
                    </p>
                  </div>

                  {/* Later Statement */}
                  <div className="rounded border border-primary/40 bg-primary/5 p-3 space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-mono text-primary">
                      <span>Later: {d.laterClaim.time}</span>
                      <span>
                        Speaker: {d.laterClaim.speaker} ({d.laterClaim.status})
                      </span>
                    </div>
                    <p className="text-xs font-medium text-foreground">
                      "{d.laterClaim.statement}"
                    </p>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed">
                  <strong className="text-foreground">Analysis:</strong> {d.explanation}
                </p>

                <div className="rounded bg-secondary/60 p-2.5 text-xs flex items-center gap-2">
                  <span className="font-mono text-primary font-bold">Action:</span>
                  <span>{d.recommendedAction}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
