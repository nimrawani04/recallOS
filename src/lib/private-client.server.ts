import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export function privateClient(token: string) {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) throw new Error("Lovable Cloud is not configured.");
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: { Authorization: `Bearer ${token}` },
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
  });
}

export async function authenticateRequest(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer /, "");
  if (!token) throw new Error("Sign in to extract a conversation.");
  const client = privateClient(token);
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) throw new Error("Your sign-in has expired. Please sign in again.");
  return { client, user: data.user };
}
