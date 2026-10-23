CREATE TABLE public.provider_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  provider text NOT NULL CHECK (provider IN ('ring', 'alexa', 'aws')),
  external_account_id text NOT NULL,
  display_name text NOT NULL,
  hardware_id uuid NOT NULL DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'connected' CHECK (status IN ('connected', 'needs_reauth', 'revoked')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  UNIQUE (user_id, provider, external_account_id)
);

CREATE INDEX provider_connections_owner_provider
  ON public.provider_connections(user_id, provider, updated_at DESC);

ALTER TABLE public.provider_connections ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.provider_connections TO authenticated;
CREATE POLICY provider_connections_read_own ON public.provider_connections
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY provider_connections_insert_own ON public.provider_connections
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY provider_connections_update_own ON public.provider_connections
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY provider_connections_delete_own ON public.provider_connections
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.provider_link_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL CHECK (provider = 'ring'),
  external_account_id text NOT NULL,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  token_expires_at timestamptz,
  scopes jsonb NOT NULL DEFAULT '[]'::jsonb,
  hardware_id uuid NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '15 minutes'),
  claimed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX provider_link_claims_lookup
  ON public.provider_link_claims(provider, external_account_id, expires_at)
  WHERE claimed_at IS NULL;

ALTER TABLE public.provider_link_claims ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.provider_link_claims FROM anon, authenticated;
GRANT ALL ON public.provider_link_claims TO service_role;

CREATE TABLE public.provider_connection_secrets (
  connection_id uuid PRIMARY KEY REFERENCES public.provider_connections(id) ON DELETE CASCADE,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  token_expires_at timestamptz,
  scopes jsonb NOT NULL DEFAULT '[]'::jsonb,
  key_version integer NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.provider_connection_secrets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.provider_connection_secrets FROM anon, authenticated;
GRANT ALL ON public.provider_connection_secrets TO service_role;

CREATE TABLE public.smart_home_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  connection_id uuid NOT NULL REFERENCES public.provider_connections(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('ring', 'alexa')),
  external_device_id text NOT NULL,
  name text NOT NULL,
  kind text NOT NULL,
  model text NOT NULL DEFAULT '',
  location text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'unknown' CHECK (status IN ('online', 'offline', 'unknown')),
  capabilities jsonb NOT NULL DEFAULT '[]'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_seen_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (connection_id, external_device_id)
);

CREATE INDEX smart_home_devices_owner_updated
  ON public.smart_home_devices(user_id, updated_at DESC);

ALTER TABLE public.smart_home_devices ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.smart_home_devices TO authenticated;
CREATE POLICY smart_home_devices_read_own ON public.smart_home_devices
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY smart_home_devices_insert_own ON public.smart_home_devices
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY smart_home_devices_update_own ON public.smart_home_devices
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY smart_home_devices_delete_own ON public.smart_home_devices
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.device_setups (
  user_id uuid PRIMARY KEY DEFAULT auth.uid(),
  selected_device_id uuid REFERENCES public.smart_home_devices(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active')),
  completed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.device_setups ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.device_setups TO authenticated;
CREATE POLICY device_setups_read_own ON public.device_setups
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY device_setups_insert_own ON public.device_setups
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY device_setups_update_own ON public.device_setups
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY device_setups_delete_own ON public.device_setups
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.provider_webhook_events (
  provider text NOT NULL,
  event_id text NOT NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  published_at timestamptz,
  received_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (provider, event_id)
);

ALTER TABLE public.provider_webhook_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.provider_webhook_events FROM anon, authenticated;
GRANT ALL ON public.provider_webhook_events TO service_role;

CREATE TABLE public.alexa_oauth_requests (
  id uuid PRIMARY KEY,
  user_id uuid,
  client_id text NOT NULL,
  redirect_uri text NOT NULL,
  state text NOT NULL,
  scope text NOT NULL,
  code_hash text,
  expires_at timestamptz NOT NULL,
  code_expires_at timestamptz,
  completed_at timestamptz,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX alexa_oauth_requests_code_lookup
  ON public.alexa_oauth_requests(client_id, code_hash)
  WHERE code_hash IS NOT NULL AND consumed_at IS NULL;

ALTER TABLE public.alexa_oauth_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.alexa_oauth_requests FROM anon, authenticated;
GRANT ALL ON public.alexa_oauth_requests TO service_role;

CREATE TABLE public.alexa_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  client_id text NOT NULL,
  access_token_hash text NOT NULL UNIQUE,
  scopes jsonb NOT NULL DEFAULT '[]'::jsonb,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX alexa_tokens_user ON public.alexa_tokens(user_id, expires_at DESC);

ALTER TABLE public.alexa_tokens ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.alexa_tokens FROM anon, authenticated;
GRANT ALL ON public.alexa_tokens TO service_role;
