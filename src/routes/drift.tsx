import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHead, StatusPill, Evidence } from "@/components/ui-bits";
import { driftEvents, type DriftEvent } from "@/lib/temporal-drift";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";

export const Route = createFileRoute("/drift")({
  head: () => ({
    meta: [
      { title: "Mental Model Drift & Risk Radar — RecallOS" },
      {
        name: "description",
        content:
          "Track team cognitive divergence, drift velocity, and predictive milestone slippage.",
      },
    ],
  }),
  component: DriftRiskRadar,
});

const DRIFT_METRICS_DATA = [
  { day: "Mon 10:00", divergence: 8, alignment: 92, riskLevel: 10 },
  { day: "Mon 17:00", divergence: 22, alignment: 78, riskLevel: 30 },
  { day: "Tue 12:00", divergence: 45, alignment: 55, riskLevel: 58 },
  { day: "Tue 19:00", divergence: 64, alignment: 36, riskLevel: 72 },
  { day: "Wed 09:30", divergence: 78, alignment: 22, riskLevel: 85 },
];

function DriftRiskRadar() {
  const [selectedDrift, setSelectedDrift] = useState<DriftEvent>(driftEvents[0]!);
  const [alignmentActionDone, setAlignmentActionDone] = useState<Record<string, boolean>>({});

  return (
    <div className="space-y-8">
      <PageHead
        kicker="Mental-Model-Drift & Bellwether System"
        title="Mental Model Drift & Predictive Risk Radar"
        sub="Inspired by Marc-Dvci/Mental-Model-Drift and usv240/bellwether. Quantifies cognitive divergence between team members over time, measures drift velocity, and predicts milestone slippage risk before deadlines are missed."
      />

      {/* Top Risk & Drift KPI Scorecards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-conflict/40 bg-conflict/10 p-5 space-y-1">
          <div className="font-mono text-xs uppercase tracking-wider text-conflict font-semibold">
            Predictive Slippage Risk
          </div>
          <div className="text-3xl font-bold text-foreground">78%</div>
          <div className="text-xs text-muted-foreground">
            High risk to Sunday demo milestone due to unverified API dependency.
          </div>
        </div>

        <div className="rounded-xl border border-primary/40 bg-primary/10 p-5 space-y-1">
          <div className="font-mono text-xs uppercase tracking-wider text-primary font-semibold">
            Cognitive Divergence
          </div>
          <div className="text-3xl font-bold text-foreground">64%</div>
          <div className="text-xs text-muted-foreground">
            3 major conflicting assumptions between chat and voice calls.
          </div>
        </div>

        <div className="rounded-xl border border-inferred/40 bg-inferred/10 p-5 space-y-1">
          <div className="font-mono text-xs uppercase tracking-wider text-inferred font-semibold">
            Drift Velocity
          </div>
          <div className="text-3xl font-bold text-foreground">+28% / 24h</div>
          <div className="text-xs text-muted-foreground">
            Acceleration triggered by unconfirmed staging auth question.
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 space-y-1">
          <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground font-semibold">
            Temporal Supersessions
          </div>
          <div className="text-3xl font-bold text-foreground">1 Resolved</div>
          <div className="text-xs text-muted-foreground">
            Deadline moved Friday 18:00 ➔ Sunday 12:00 (Priya supersedes Arjun).
          </div>
        </div>
      </div>

      {/* ChartKeep-inspired Context Visualization */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <div>
              <h3 className="text-sm font-semibold">Cognitive Divergence vs Team Alignment</h3>
              <p className="text-xs text-muted-foreground">ChartKeep visual context timeline</p>
            </div>
            <span className="font-mono text-[11px] text-primary font-semibold">Mon - Wed</span>
          </div>

          <div className="h-56 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={DRIFT_METRICS_DATA}>
                <defs>
                  <linearGradient id="divGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="oklch(0.8 0.15 75)" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="oklch(0.8 0.15 75)" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="alignGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="oklch(0.75 0.14 155)" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="oklch(0.75 0.14 155)" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" stroke="#888888" fontSize={10} />
                <YAxis stroke="#888888" fontSize={10} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "oklch(0.2 0.012 250)",
                    borderColor: "oklch(0.3 0.012 250)",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="divergence"
                  name="Divergence %"
                  stroke="oklch(0.8 0.15 75)"
                  fillOpacity={1}
                  fill="url(#divGradient)"
                />
                <Area
                  type="monotone"
                  dataKey="alignment"
                  name="Alignment %"
                  stroke="oklch(0.75 0.14 155)"
                  fillOpacity={1}
                  fill="url(#alignGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bellwether Predictive Risk Projection */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <div>
              <h3 className="text-sm font-semibold">Bellwether Milestone Slippage Index</h3>
              <p className="text-xs text-muted-foreground">
                Early-warning projection based on leading signals
              </p>
            </div>
            <span className="font-mono text-[11px] text-conflict font-semibold">Critical</span>
          </div>

          <div className="h-56 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={DRIFT_METRICS_DATA}>
                <XAxis dataKey="day" stroke="#888888" fontSize={10} />
                <YAxis stroke="#888888" fontSize={10} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "oklch(0.2 0.012 250)",
                    borderColor: "oklch(0.3 0.012 250)",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Bar
                  dataKey="riskLevel"
                  name="Slippage Risk %"
                  fill="oklch(0.68 0.19 30)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Interactive Drift Event Inspector */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Active Drift Vectors & Discrepancies</h2>

        <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
          <div className="space-y-3">
            {driftEvents.map((d) => (
              <div
                key={d.id}
                onClick={() => setSelectedDrift(d)}
                className={`cursor-pointer rounded-xl border p-4 transition ${
                  selectedDrift.id === d.id
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border bg-card hover:border-foreground/30"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-foreground">{d.topic}</span>
                    <span
                      className={`rounded px-2 py-0.5 font-mono text-[10px] uppercase font-semibold ${
                        d.severity === "high"
                          ? "bg-conflict/20 text-conflict"
                          : "bg-inferred/20 text-inferred"
                      }`}
                    >
                      {d.severity}
                    </span>
                  </div>
                  <span className="font-mono text-[11px] text-muted-foreground uppercase">
                    {d.type}
                  </span>
                </div>

                <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{d.explanation}</p>
              </div>
            ))}
          </div>

          {/* Detailed Drift Deep-Dive & Action Card */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <div>
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Selected Drift Vector
              </span>
              <h3 className="text-base font-bold text-foreground mt-0.5">{selectedDrift.topic}</h3>
            </div>

            <div className="space-y-2.5">
              <div className="rounded border border-border/80 bg-background/80 p-3 space-y-1">
                <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                  <span>Timestamp: {selectedDrift.earlierClaim.time}</span>
                  <span>Speaker: {selectedDrift.earlierClaim.speaker}</span>
                </div>
                <p className="text-xs font-medium">"{selectedDrift.earlierClaim.statement}"</p>
                <div className="pt-1">
                  <Evidence id={selectedDrift.earlierClaim.sourceId} />
                </div>
              </div>

              <div className="rounded border border-primary/40 bg-primary/5 p-3 space-y-1">
                <div className="flex items-center justify-between text-[11px] font-mono text-primary font-semibold">
                  <span>Superseding: {selectedDrift.laterClaim.time}</span>
                  <span>
                    Speaker: {selectedDrift.laterClaim.speaker} ({selectedDrift.laterClaim.status})
                  </span>
                </div>
                <p className="text-xs font-medium">"{selectedDrift.laterClaim.statement}"</p>
                <div className="pt-1">
                  <Evidence id={selectedDrift.laterClaim.sourceId} />
                </div>
              </div>
            </div>

            <div className="rounded bg-secondary p-3 text-xs space-y-1.5">
              <div className="font-mono text-[11px] text-primary uppercase font-bold">
                Alexa+ Alignment Action:
              </div>
              <p className="text-xs text-foreground">{selectedDrift.recommendedAction}</p>
              <button
                onClick={() =>
                  setAlignmentActionDone((prev) => ({
                    ...prev,
                    [selectedDrift.id]: !prev[selectedDrift.id],
                  }))
                }
                className="mt-2 rounded bg-primary px-3 py-1 font-mono text-xs font-medium text-primary-foreground hover:opacity-90"
              >
                {alignmentActionDone[selectedDrift.id]
                  ? "✓ Alignment Dispatched to Team"
                  : "Dispatch Alignment Action via Alexa+"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
