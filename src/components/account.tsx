import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { oauthReturnPath } from "@/lib/oauth-return-path";
import "@lovable.dev/cloud-auth-js/styles.css";

const AccountContext = createContext<{ session: Session | null; ready: boolean }>({
  session: null,
  ready: false,
});
export const useAccount = () => useContext(AccountContext);
export function AccountProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, value) => {
      setSession(value);
      setReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (!session) return;
    const next = sessionStorage.getItem("recallos-signin-next");
    if (next) {
      sessionStorage.removeItem("recallos-signin-next");
      window.location.assign(oauthReturnPath(next));
    }
  }, [session?.user.id]);
  return <AccountContext.Provider value={{ session, ready }}>{children}</AccountContext.Provider>;
}
export function SignIn({ next }: { next?: string }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function signIn(provider: "google") {
    setBusy(true);
    setError("");
    sessionStorage.setItem(
      "recallos-signin-next",
      oauthReturnPath(next ?? window.location.pathname + window.location.search),
    );
    try {
      const result = await lovable.auth.signInWithOAuth(provider, {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        sessionStorage.removeItem("recallos-signin-next");
        setError(result.error.message);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign-in failed.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        <Button disabled={busy} onClick={() => signIn("google")}>
          Continue with Google
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
