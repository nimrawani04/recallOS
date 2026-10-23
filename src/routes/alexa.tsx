import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { PageHead, StatusPill, Evidence } from "@/components/ui-bits";
import { runWebMCPTool } from "@/lib/webmcp-telemetry";
import { useAccount } from "@/components/account";
import { useMemoryStore } from "@/lib/memory-store";

export const Route = createFileRoute("/alexa")({
  head: () => ({
    meta: [
      { title: "Alexa+ Simulator — RecallOS" },
      {
        name: "description",
        content:
          "Interactive Alexa+ voice simulator demonstrating real-time MCP tool calling and evidence grounding.",
      },
    ],
  }),
  component: AlexaSimulator,
});

interface QueryPreset {
  prompt: string;
  tool: string;
  args: Record<string, unknown>;
  alexaSpoken: string;
  cardTitle: string;
  cardSub: string;
  sourceIds: string[];
}

type LiveCitation = {
  id: string | undefined;
  speaker: string | undefined;
  passage: string;
  timestamp: string | undefined;
  channel: string | undefined;
};

type BrowserSpeechRecognition = {
  start: () => void;
  stop: () => void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript?: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};
type BrowserSpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

function collectLiveCitations(value: unknown, result: LiveCitation[] = []): LiveCitation[] {
  if (!value || typeof value !== "object") return result;
  if (Array.isArray(value)) {
    value.forEach((item) => collectLiveCitations(item, result));
    return result;
  }
  const record = value as Record<string, unknown>;
  if (typeof record["passage"] === "string") {
    result.push({
      id: typeof record["id"] === "string" ? record["id"] : undefined,
      speaker: typeof record["speaker"] === "string" ? record["speaker"] : undefined,
      passage: record["passage"],
      timestamp: typeof record["timestamp"] === "string" ? record["timestamp"] : undefined,
      channel: typeof record["channel"] === "string" ? record["channel"] : undefined,
    });
  }
  Object.values(record).forEach((child) => collectLiveCitations(child, result));
  return result;
}

function spokenFromResult(value: unknown, fallback: string) {
  if (
    value &&
    typeof value === "object" &&
    typeof (value as Record<string, unknown>)["spoken"] === "string"
  ) {
    return (value as Record<string, unknown>)["spoken"] as string;
  }
  return fallback;
}

const PRESETS: QueryPreset[] = [
  {
    prompt: "Alexa, what did I promise this week?",
    tool: "recall_check_commitments",
    args: { person: "You", includeTentative: true },
    alexaSpoken:
      "You have one firm commitment: to share retrieval experiment results by Wednesday, which is now overdue. You also tentatively mentioned helping with the report, but that was tentative, not a firm promise.",
    cardTitle: "Commitment Audit for 'You'",
    cardSub: "Grounding: s2 (firm) vs s7 (tentative)",
    sourceIds: ["s2", "s7"],
  },
  {
    prompt: "Alexa, when is the demo due?",
    tool: "recall_query_memories",
    args: { query: "demo deadline" },
    alexaSpoken:
      "The final demo is due Sunday at 12:00 PM noon. Arjun originally stated Friday at 6:00 PM, but Priya announced on Tuesday that the organisers extended the deadline.",
    cardTitle: "Demo Deadline (Temporal Supersession Resolved)",
    cardSub: "Superseded: Mon 16:40 (Friday) → Confirmed: Tue 18:30 (Sunday noon)",
    sourceIds: ["s3", "s5"],
  },
  {
    prompt: "Alexa, why is my project at risk?",
    tool: "recall_get_briefing",
    args: { filterLevel: "blocker" },
    alexaSpoken:
      "Your project has a critical blocker: Monday's decision requires the API integration before the demo, but Wednesday morning standup confirmed the team is still waiting to see if it is wired up.",
    cardTitle: "Project Risk: Unconfirmed API Wiring",
    cardSub: "Ranked #1 risk to Sunday demo milestone",
    sourceIds: ["s1", "s6"],
  },
  {
    prompt: "Alexa, did anyone fix the staging auth errors?",
    tool: "recall_query_memories",
    args: { query: "authentication staging errors" },
    alexaSpoken:
      "I cannot confirm. Arjun asked on Tuesday at 11:05 AM if anyone fixed the authentication errors, and no reply was found across your connected channels. I won't assume it's fixed.",
    cardTitle: "Unresolved Question: Staging Auth Errors",
    cardSub: "Status: Unresolved (Negative evidence preserved)",
    sourceIds: ["s4"],
  },
  {
    prompt: "Alexa, check for mental model drift in the team.",
    tool: "recall_detect_drift",
    args: {},
    alexaSpoken:
      "I detected two key cognitive shifts: first, the demo deadline moved from Friday to Sunday; second, team assumptions on API integration readiness conflict with the latest standup status.",
    cardTitle: "Mental Model Drift Analysis",
    cardSub: "3 drift vectors identified across Mon-Wed transcripts",
    sourceIds: ["s3", "s5", "s1", "s6"],
  },
  {
    prompt: "Alexa, run memory consolidation.",
    tool: "recall_consolidate",
    args: { pruneResolved: false },
    alexaSpoken:
      "Consolidation complete. 7 episodic conversation passages synthesized into 6 entity nodes, with 1 temporal supersession resolved and 1 open blocker flagged.",
    cardTitle: "Machine Dream: Memory Consolidation",
    cardSub: "Knowledge graph updated with 6 consolidated entities",
    sourceIds: ["s1", "s2", "s5"],
  },
];

function AlexaSimulator() {
  const { session } = useAccount();
  const { dataset, executeTool } = useMemoryStore();
  const [activePreset, setActivePreset] = useState<QueryPreset | null>(PRESETS[0]!);
  const [customInput, setCustomInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [alexaState, setAlexaState] = useState<"idle" | "listening" | "thinking" | "speaking">(
    "idle",
  );
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [spokenResponse, setSpokenResponse] = useState(PRESETS[0]!.alexaSpoken);
  const [mcpLog, setMcpLog] = useState<{
    tool: string;
    args: Record<string, unknown>;
    durationMs: number;
    response: unknown;
  } | null>(null);

  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);

  const speak = (text: string) => {
    if (!voiceEnabled || typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    utterance.onstart = () => setAlexaState("speaking");
    utterance.onend = () => setAlexaState("idle");
    utterance.onerror = () => setAlexaState("idle");
    synthRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const callLiveMcp = async (preset: QueryPreset) => {
    if (!session?.access_token) return undefined;
    const response = await fetch("/api/mcp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: crypto.randomUUID(),
        method: "tools/call",
        params: { name: preset.tool, arguments: preset.args },
      }),
    });
    const payload = (await response.json()) as {
      error?: { message?: string };
      result?: { structuredContent?: unknown };
    };
    if (!response.ok || payload.error)
      throw new Error(payload.error?.message ?? "The protected MCP request failed.");
    return payload.result?.structuredContent;
  };

  const startListening = () => {
    if (typeof window === "undefined") return;
    const speechWindow = window as Window & {
      SpeechRecognition?: BrowserSpeechRecognitionConstructor;
      webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor;
    };
    const Recognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    if (!Recognition) {
      setMcpLog({
        tool: "voice_input",
        args: {},
        durationMs: 0,
        response: {
          error: "This browser does not expose SpeechRecognition. Use the text prompt instead.",
        },
      });
      return;
    }
    const recognition = new Recognition();
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript;
      if (transcript) setCustomInput(transcript);
    };
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognitionRef.current = recognition;
    setIsListening(true);
    recognition.start();
  };

  const executePreset = async (preset: QueryPreset) => {
    setActivePreset(preset);
    setIsProcessing(true);
    setAlexaState("thinking");

    const startTime = performance.now();
    let resultPayload: unknown = null;

    try {
      await runWebMCPTool(preset.tool, async () => {
        if (session?.access_token) {
          resultPayload = await callLiveMcp(preset);
          return;
        }

        // Live data-driven MCP execution against reactive dataset (local + cloud imports)
        resultPayload = await executeTool(preset.tool, preset.args);
      });

      const elapsed = Math.round(performance.now() - startTime);
      setMcpLog({
        tool: preset.tool,
        args: preset.args,
        durationMs: elapsed,
        response: resultPayload,
      });

      setAlexaState("speaking");
      const spoken = spokenFromResult(resultPayload, preset.alexaSpoken);
      setSpokenResponse(spoken);
      speak(spoken);
    } catch (error) {
      const message = error instanceof Error ? error.message : "MCP request failed.";
      setMcpLog({
        tool: preset.tool,
        args: preset.args,
        durationMs: Math.round(performance.now() - startTime),
        response: { error: message },
      });
      setAlexaState("idle");
    } finally {
      setIsProcessing(false);
      setTimeout(() => {
        if (!voiceEnabled) setAlexaState("idle");
      }, 1200);
    }
  };

  const handleCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = customInput.trim();
    if (!query) return;

    const matchedPreset = PRESETS.find((p) => p.prompt.toLowerCase().includes(query.toLowerCase()));

    if (matchedPreset) {
      executePreset(matchedPreset);
      return;
    }

    // Dynamic voice & visual search for arbitrary user voice prompt
    const customPreset: QueryPreset = {
      prompt: query.startsWith("Alexa") ? query : `Alexa, ${query}`,
      tool: "recall_query_memories",
      args: { query },
      alexaSpoken: `Searching connected transcripts for "${query}"...`,
      cardTitle: `Search Results: "${query}"`,
      cardSub: "Evidence validated via live RecallOS MCP",
      sourceIds: [],
    };

    setActivePreset(customPreset);
    setIsProcessing(true);
    setAlexaState("thinking");
    const startTime = performance.now();

    try {
      let resultPayload: unknown = null;
      await runWebMCPTool(customPreset.tool, async () => {
        if (session?.access_token) {
          resultPayload = await callLiveMcp(customPreset);
        } else {
          resultPayload = await executeTool(customPreset.tool, customPreset.args);
        }
      });

      const res = resultPayload as {
        grounded?: boolean;
        count?: number;
        memories?: Array<{
          id: string;
          title: string;
          supportingEvidence?: Array<{ id: string; passage: string; speaker?: string }>;
        }>;
      };

      const topMemory = res?.memories?.[0];
      const sourceIds = topMemory?.supportingEvidence?.map((e) => e.id) ?? [];
      const spokenText = topMemory
        ? `According to your team records: ${topMemory.title}.`
        : `I searched your connected transcripts for "${query}", but found no verifiable evidence. I will not make assumptions.`;

      const resolvedPreset: QueryPreset = {
        ...customPreset,
        alexaSpoken: spokenText,
        cardSub: topMemory
          ? `Grounded in ${topMemory.id} with ${sourceIds.length} citation(s)`
          : "Negative evidence preserved — no ungrounded claims",
        sourceIds,
      };

      setActivePreset(resolvedPreset);
      setMcpLog({
        tool: customPreset.tool,
        args: customPreset.args,
        durationMs: Math.round(performance.now() - startTime),
        response: resultPayload,
      });

      setAlexaState("speaking");
      speak(spokenText);
    } catch (error) {
      const message = error instanceof Error ? error.message : "MCP query failed.";
      setMcpLog({
        tool: customPreset.tool,
        args: customPreset.args,
        durationMs: Math.round(performance.now() - startTime),
        response: { error: message },
      });
      setAlexaState("idle");
    } finally {
      setIsProcessing(false);
      setTimeout(() => {
        if (!voiceEnabled) setAlexaState("idle");
      }, 1200);
    }
  };

  // Run initial preset once on mount
  useEffect(() => {
    executePreset(PRESETS[0]!);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-8">
      <PageHead
        kicker="Amazon Alexa+ MCP Hackathon Demo"
        title="Alexa+ Voice & Visual Memory Client"
        sub="Simulates an Amazon Echo Show / Alexa+ device interacting with RecallOS through the Model Context Protocol (MCP). Every spoken response is anchored in verifiable source quotes."
      />

      {/* Preset Command Bar */}
      <div>
        <div className="mb-2 text-xs font-mono uppercase tracking-wider text-muted-foreground">
          Voice Prompts (Click to invoke MCP Tool):
        </div>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p, idx) => (
            <button
              key={idx}
              onClick={() => executePreset(p)}
              disabled={isProcessing}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${
                activePreset?.prompt === p.prompt
                  ? "border-primary bg-primary/10 text-primary ring-1 ring-primary"
                  : "bg-card text-muted-foreground hover:border-foreground/30 hover:text-foreground"
              }`}
            >
              🎙️ "{p.prompt.replace(/^Alexa,\s*/i, "")}"
            </button>
          ))}
        </div>
      </div>

      {/* Echo Show / Alexa+ Device Frame */}
      <div className="relative overflow-hidden rounded-2xl border-2 border-border/80 bg-gradient-to-b from-card to-background p-6 shadow-2xl">
        {/* Device Top Bar: Ambient Light Indicator & Voice Toggle */}
        <div className="flex items-center justify-between border-b border-border/50 pb-4">
          <div className="flex items-center gap-3">
            {/* Glowing Alexa Orb */}
            <div
              className={`relative flex h-8 w-8 items-center justify-center rounded-full transition-all duration-500 ${
                alexaState === "thinking"
                  ? "animate-pulse bg-gradient-to-tr from-purple-500 to-indigo-500 shadow-[0_0_20px_rgba(168,85,247,0.7)]"
                  : alexaState === "speaking"
                    ? "bg-gradient-to-tr from-cyan-400 to-blue-500 shadow-[0_0_20px_rgba(34,211,238,0.7)]"
                    : "bg-gradient-to-tr from-amber-400 to-emerald-500 shadow-[0_0_12px_rgba(52,211,153,0.4)]"
              }`}
            >
              <span className="font-mono text-[10px] font-bold text-background">A+</span>
            </div>
            <div>
              <div className="font-mono text-xs font-semibold uppercase tracking-wider">
                Amazon Alexa+ Smart Display
              </div>
              <div className="text-[11px] text-muted-foreground">
                Mode:{" "}
                <span className="font-mono text-primary font-medium uppercase">
                  {session ? "Live protected MCP" : "Offline demo"} ·{" "}
                  {alexaState === "thinking"
                    ? "Executing MCP Tool..."
                    : alexaState === "speaking"
                      ? "Speaking & Projecting Evidence"
                      : "Ready for Prompt"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setVoiceEnabled(!voiceEnabled);
                if (voiceEnabled && typeof window !== "undefined") window.speechSynthesis?.cancel();
              }}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-xs transition ${
                voiceEnabled
                  ? "border-primary bg-primary text-primary-foreground font-medium"
                  : "border-border bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>{voiceEnabled ? "🔊 Speech: ON" : "🔇 Speech: OFF"}</span>
            </button>
          </div>
        </div>

        {/* Alexa Spoken Dialogue & Waveform */}
        <div className="py-6">
          <div className="text-xs font-mono text-muted-foreground">
            User: <span className="text-foreground font-medium">"{activePreset?.prompt}"</span>
          </div>

          <div className="mt-4 flex items-start gap-4">
            <div className="rounded-lg bg-primary/10 p-3 border border-primary/20">
              <span className="text-2xl">🗣️</span>
            </div>
            <div className="flex-1">
              <div className="font-mono text-xs uppercase tracking-wider text-primary">
                Alexa+ Response:
              </div>
              <p className="mt-1 text-xl font-normal leading-relaxed text-foreground">
                {spokenResponse}
              </p>
            </div>
          </div>

          {/* Voice Wave Animation */}
          {alexaState === "speaking" && (
            <div className="mt-4 flex items-center justify-center gap-1">
              {[3, 7, 4, 9, 6, 8, 5, 10, 4, 8, 3].map((h, i) => (
                <div
                  key={i}
                  className="w-1 rounded-full bg-primary animate-pulse"
                  style={{
                    height: `${h * 3}px`,
                    animationDelay: `${i * 90}ms`,
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Visual Screen Card Grounding Display */}
        <div className="rounded-xl border border-border/80 bg-card/60 p-5 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-3">
            <div>
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                On-Screen Visual Card
              </span>
              <h3 className="text-base font-semibold text-foreground">{activePreset?.cardTitle}</h3>
              <p className="text-xs text-muted-foreground">{activePreset?.cardSub}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-confirmed/20 px-2 py-0.5 font-mono text-[11px] font-medium text-confirmed">
                {session ? "Live OAuth MCP" : "Live data-driven MCP"}
              </span>
            </div>
          </div>

          {/* Supporting Evidence Passages */}
          <div className="mt-4 space-y-2.5">
            <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
              Verbatim Quotes Cited from User Records:
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              {mcpLog?.response && collectLiveCitations(mcpLog.response).length > 0
                ? collectLiveCitations(mcpLog.response)
                    .slice(0, 6)
                    .map((citation, index) => (
                      <div
                        key={`${citation.id ?? "live"}-${index}`}
                        className="rounded-md border-l-2 border-primary bg-muted/60 px-3 py-2"
                      >
                        <div className="font-mono text-[11px] text-muted-foreground">
                          {citation.timestamp ?? "Connected record"}
                          {citation.channel ? ` · ${citation.channel}` : ""}
                          {citation.speaker ? ` · ${citation.speaker}` : ""}
                        </div>
                        <p className="mt-1 text-sm">"{citation.passage}"</p>
                      </div>
                    ))
                : activePreset?.sourceIds.map((sid) => <Evidence key={sid} id={sid} />)}
            </div>
          </div>
        </div>

        {/* Custom Prompt Input */}
        <form onSubmit={handleCustomSubmit} className="mt-6 flex gap-2">
          <button
            type="button"
            onClick={startListening}
            disabled={isProcessing || isListening}
            className={`rounded-lg border px-3 py-2.5 text-xs font-mono transition ${isListening ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground hover:text-foreground"}`}
            title="Use browser speech recognition when available"
          >
            {isListening ? "Listening…" : "🎙 Talk"}
          </button>
          <input
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            placeholder="Say something to Alexa... e.g. 'When is the deadline?' or 'What did I promise?'"
            className="flex-1 rounded-lg border border-input bg-card px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            type="submit"
            disabled={isProcessing}
            className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
          >
            Ask Alexa+
          </button>
        </form>
      </div>

      {/* MCP Telemetry & Tool Inspector Tray */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-bold text-primary">
              ⚡ MCP Protocol Inspector
            </span>
            <span className="rounded bg-secondary px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
              JSON-RPC 2.0
            </span>
          </div>
          {mcpLog && (
            <span className="font-mono text-xs text-muted-foreground">
              Duration: <span className="text-confirmed font-semibold">{mcpLog.durationMs}ms</span>
            </span>
          )}
        </div>

        {mcpLog ? (
          <div className="mt-4 space-y-3 font-mono text-xs">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Tool Invoked:</span>
              <span className="rounded bg-primary/20 px-2 py-0.5 font-bold text-primary">
                {mcpLog.tool}
              </span>
            </div>

            <div>
              <div className="text-muted-foreground">Tool Arguments:</div>
              <pre className="mt-1 overflow-x-auto rounded bg-background p-3 text-[11px] text-foreground">
                {JSON.stringify(mcpLog.args, null, 2)}
              </pre>
            </div>

            <div>
              <div className="text-muted-foreground">Structured MCP Response:</div>
              <pre className="mt-1 max-h-48 overflow-auto rounded bg-background p-3 text-[11px] text-emerald-400">
                {JSON.stringify(mcpLog.response, null, 2)}
              </pre>
            </div>
          </div>
        ) : (
          <p className="mt-3 text-xs text-muted-foreground">
            Select a voice prompt above to inspect the MCP tool call.
          </p>
        )}
      </div>
    </div>
  );
}
