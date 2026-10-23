import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, LoaderCircle, ShieldCheck } from "lucide-react";
import { SignIn, useAccount } from "@/components/account";
import { completeAlexaLink } from "@/lib/device-connections.functions";

export const Route = createFileRoute("/alexa/link")({
  head: () => ({
    meta: [{ title: "Link Alexa — RecallOS" }],
  }),
  component: AlexaLink,
});

function AlexaLink() {
  const { ready, session } = useAccount();
  const [status, setStatus] = useState<"waiting" | "working" | "complete" | "error">("waiting");
  const [message, setMessage] = useState("");
  const requestId =
    typeof window === "undefined"
      ? ""
      : (new URLSearchParams(window.location.search).get("request_id") ?? "");

  useEffect(() => {
    if (!ready || !session || !requestId || status !== "waiting") return;
    setStatus("working");
    completeAlexaLink({ data: { requestId } })
      .then(({ redirectUrl }) => {
        setStatus("complete");
        window.location.assign(redirectUrl);
      })
      .catch((error: unknown) => {
        setStatus("error");
        setMessage(error instanceof Error ? error.message : "Alexa linking failed.");
      });
  }, [ready, requestId, session, status]);

  if (!requestId) {
    return <LinkError message="This Alexa linking request is missing its request ID." />;
  }

  return (
    <div className="mx-auto max-w-lg py-10">
      <div className="rounded-3xl border border-border bg-card p-6 shadow-2xl sm:p-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-300 via-blue-500 to-indigo-700 font-mono font-bold text-white">
          A
        </div>
        <div className="mt-6 font-mono text-xs uppercase tracking-[0.2em] text-primary">
          Alexa account linking
        </div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Connect Alexa to RecallOS</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Sign in to RecallOS to let your Alexa Smart Home skill discover the Ring devices you have
          approved.
        </p>
        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-confirmed/25 bg-confirmed/5 p-4 text-xs leading-5 text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-confirmed" />
          RecallOS receives an opaque Alexa access token. Ring credentials stay server-side and are
          never sent to Alexa or this browser.
        </div>
        {!session && status === "waiting" && (
          <div className="mt-7">
            <SignIn next={`/alexa/link?request_id=${encodeURIComponent(requestId)}`} />
          </div>
        )}
        {status === "working" && (
          <div className="mt-7 flex items-center gap-2 text-sm text-muted-foreground">
            <LoaderCircle className="h-4 w-4 animate-spin text-primary" /> Finishing secure Alexa
            link…
          </div>
        )}
        {status === "complete" && (
          <div className="mt-7 flex items-center gap-2 text-sm text-confirmed">
            <CheckCircle2 className="h-4 w-4" /> Returning to Alexa…
          </div>
        )}
        {status === "error" && (
          <div className="mt-7 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {message}
          </div>
        )}
      </div>
    </div>
  );
}

function LinkError({ message }: { message: string }) {
  return (
    <div className="mx-auto max-w-lg py-10">
      <div className="rounded-3xl border border-destructive/30 bg-destructive/10 p-6 text-sm text-destructive">
        {message}
      </div>
    </div>
  );
}
