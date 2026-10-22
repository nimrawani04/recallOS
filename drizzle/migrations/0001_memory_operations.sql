CREATE TABLE public.memory_operations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL DEFAULT auth.uid(),
 request_id text NOT NULL,
 operation text NOT NULL,
 payload jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE (user_id, request_id)
);
GRANT SELECT ON public.memory_operations TO authenticated;
REVOKE INSERT ON public.memory_operations FROM authenticated;
GRANT ALL ON public.memory_operations TO service_role;
ALTER TABLE public.memory_operations ENABLE ROW LEVEL SECURITY;
CREATE POLICY memory_operations_read_own ON public.memory_operations FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY memory_operations_insert_own ON public.memory_operations FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE INDEX memory_operations_owner_created ON public.memory_operations(user_id, created_at DESC);
