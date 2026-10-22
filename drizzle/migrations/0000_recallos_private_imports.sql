CREATE TABLE public.conversation_imports (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL DEFAULT auth.uid(),
 title text NOT NULL,
 conversation text NOT NULL,
 extraction jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.conversation_imports TO authenticated;
GRANT ALL ON public.conversation_imports TO service_role;
ALTER TABLE public.conversation_imports ENABLE ROW LEVEL SECURITY;
CREATE POLICY imports_read_own ON public.conversation_imports FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY imports_insert_own ON public.conversation_imports FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY imports_delete_own ON public.conversation_imports FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX imports_owner_created ON public.conversation_imports(user_id, created_at DESC);
CREATE TABLE public.ai_access_state (
 id text PRIMARY KEY,
 status integer NOT NULL,
 message text NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.ai_access_state TO service_role;
ALTER TABLE public.ai_access_state ENABLE ROW LEVEL SECURITY;
