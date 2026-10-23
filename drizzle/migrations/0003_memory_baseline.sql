CREATE TABLE public.memory_sources (
  id text PRIMARY KEY,
  day text NOT NULL,
  time text NOT NULL,
  channel text NOT NULL,
  speaker text NOT NULL,
  passage text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.memory_sources TO anon, authenticated;
GRANT ALL ON public.memory_sources TO service_role;
ALTER TABLE public.memory_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY memory_sources_read_all ON public.memory_sources FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.memories (
  id text PRIMARY KEY,
  kind text NOT NULL CHECK (kind IN ('decision', 'question', 'task', 'deadline', 'commitment', 'fact')),
  title text NOT NULL,
  status text NOT NULL CHECK (status IN ('confirmed', 'inferred', 'conflict', 'unknown')),
  confidence double precision NOT NULL,
  sources jsonb NOT NULL DEFAULT '[]'::jsonb,
  entities jsonb NOT NULL DEFAULT '[]'::jsonb,
  history jsonb,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.memories TO anon, authenticated;
GRANT ALL ON public.memories TO service_role;
ALTER TABLE public.memories ENABLE ROW LEVEL SECURITY;
CREATE POLICY memories_read_all ON public.memories FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.briefing_items (
  id text PRIMARY KEY,
  level text NOT NULL CHECK (level IN ('blocker', 'overdue', 'followup', 'change')),
  title text NOT NULL,
  why text NOT NULL,
  memory_id text NOT NULL,
  action text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.briefing_items TO anon, authenticated;
GRANT ALL ON public.briefing_items TO service_role;
ALTER TABLE public.briefing_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY briefing_items_read_all ON public.briefing_items FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.drift_events (
  id text PRIMARY KEY,
  topic text NOT NULL,
  type text NOT NULL CHECK (type IN ('deadline_shift', 'unverified_assumption', 'commitment_conflict', 'divergent_view')),
  severity text NOT NULL CHECK (severity IN ('high', 'medium', 'low')),
  earlier_claim jsonb NOT NULL,
  later_claim jsonb NOT NULL,
  explanation text NOT NULL,
  recommended_action text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.drift_events TO anon, authenticated;
GRANT ALL ON public.drift_events TO service_role;
ALTER TABLE public.drift_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY drift_events_read_all ON public.drift_events FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.drift_chart_metrics (
  id text PRIMARY KEY,
  day text NOT NULL,
  divergence integer NOT NULL,
  alignment integer NOT NULL,
  risk_level integer NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.drift_chart_metrics TO anon, authenticated;
GRANT ALL ON public.drift_chart_metrics TO service_role;
ALTER TABLE public.drift_chart_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY drift_chart_metrics_read_all ON public.drift_chart_metrics FOR SELECT TO anon, authenticated USING (true);

-- Seed baseline memory sources
INSERT INTO public.memory_sources (id, day, time, channel, speaker, passage) VALUES
('s1', 'Mon', '10:12', 'Team call', 'Priya', 'Let''s agree: the API integration has to be done before the final demo. No exceptions.'),
('s2', 'Mon', '10:20', 'Team call', 'You', 'I''ll run the retrieval experiment and share results by Wednesday.'),
('s3', 'Mon', '16:40', 'Chat', 'Arjun', 'Demo deadline is Friday 6pm.'),
('s4', 'Tue', '11:05', 'Chat', 'Arjun', 'Did anyone fix the authentication errors on staging?'),
('s5', 'Tue', '18:30', 'Team call', 'Priya', 'Organisers extended it — we now have until Sunday noon for the demo.'),
('s6', 'Wed', '09:15', 'Standup', 'Meera', 'Frontend is complete. Still waiting to hear if the API side is wired up.'),
('s7', 'Wed', '09:18', 'Standup', 'You', 'Maybe I can look at the report too, not sure yet.')
ON CONFLICT (id) DO NOTHING;

-- Seed baseline memories
INSERT INTO public.memories (id, kind, title, status, confidence, sources, entities, history, note) VALUES
('m1', 'decision', 'API integration must be finished before the final demo', 'confirmed', 0.96, '["s1"]'::jsonb, '["API integration", "Final demo", "Priya"]'::jsonb, NULL, NULL),
('m2', 'deadline', 'Final demo due Sunday 12:00', 'confirmed', 0.91, '["s3", "s5"]'::jsonb, '["Final demo", "Arjun", "Priya"]'::jsonb, '[{"at": "Mon 16:40", "text": "Friday 18:00 (Arjun)"}, {"at": "Tue 18:30", "text": "Sunday 12:00 — extended by organisers (Priya)", "current": true}]'::jsonb, 'Later statement supersedes the earlier one. Both kept in history.'),
('m3', 'question', 'Are the staging authentication errors fixed?', 'unknown', 0.88, '["s4"]'::jsonb, '["Authentication", "Arjun"]'::jsonb, NULL, 'No answer found in connected records. This does not prove nobody replied elsewhere.'),
('m4', 'task', 'API integration completion', 'conflict', 0.72, '["s1", "s6"]'::jsonb, '["API integration", "Meera"]'::jsonb, NULL, 'Required by a decision, but the latest update does not confirm completion.'),
('m5', 'task', 'Frontend complete', 'confirmed', 0.93, '["s6"]'::jsonb, '["Frontend", "Meera"]'::jsonb, NULL, NULL),
('m6', 'commitment', 'You: share retrieval experiment results by Wednesday', 'confirmed', 0.94, '["s2"]'::jsonb, '["Retrieval experiment", "You"]'::jsonb, NULL, 'Explicit promise. No results shared in connected records — now overdue.'),
('m7', 'commitment', 'You: possibly help with the report', 'inferred', 0.41, '["s7"]'::jsonb, '["Report", "You"]'::jsonb, NULL, 'Tentative wording (''maybe'', ''not sure''). Not treated as a firm promise.')
ON CONFLICT (id) DO NOTHING;

-- Seed baseline briefing items
INSERT INTO public.briefing_items (id, level, title, why, memory_id, action, sort_order) VALUES
('b1', 'blocker', 'API integration is not confirmed complete', 'Monday''s decision makes it a demo requirement. Wednesday''s standup still waits on it.', 'm4', 'Ask Meera & Priya for API status', 1),
('b2', 'overdue', 'Your retrieval experiment results were due Wednesday', 'You promised this on Monday''s call. No results found in connected records.', 'm6', 'Draft a status update', 2),
('b3', 'followup', 'Authentication question is unanswered', 'Arjun asked on Tuesday. No reply found — search covers connected sources only.', 'm3', 'Reply to Arjun', 3),
('b4', 'change', 'Demo deadline moved: Friday → Sunday 12:00', 'Tuesday''s call superseded Monday''s chat message.', 'm2', 'Update reminder', 4)
ON CONFLICT (id) DO NOTHING;

-- Seed baseline drift events
INSERT INTO public.drift_events (id, topic, type, severity, earlier_claim, later_claim, explanation, recommended_action, sort_order) VALUES
('drift-1', 'Final Demo Submission Deadline', 'deadline_shift', 'high', '{"speaker":"Arjun","statement":"Demo deadline is Friday 6pm.","time":"Mon 16:40","sourceId":"s3"}'::jsonb, '{"speaker":"Priya","statement":"Organisers extended it — we now have until Sunday noon for the demo.","time":"Tue 18:30","sourceId":"s5","status":"supersedes"}'::jsonb, 'Later statement by team lead supersedes the earlier deadline. Standard vector RAG naively returns Friday 6pm, causing panic; RecallOS tracks temporal supersession.', 'Sync team calendar to Sunday 12:00 PM and notify all stakeholders.', 1),
('drift-2', 'API Integration Readiness vs Standup Reality', 'commitment_conflict', 'high', '{"speaker":"Priya","statement":"Let''s agree: the API integration has to be done before the final demo. No exceptions.","time":"Mon 10:12","sourceId":"s1"}'::jsonb, '{"speaker":"Meera","statement":"Frontend is complete. Still waiting to hear if the API side is wired up.","time":"Wed 09:15","sourceId":"s6","status":"conflicts"}'::jsonb, 'A binding decision requires the API for the demo, but Wednesday morning standup proves nobody has verified the API wiring.', 'Escalate immediately to Priya & backend owner before afternoon dry-run.', 2),
('drift-3', 'Staging Authentication Status (Cognitive Void)', 'unverified_assumption', 'medium', '{"speaker":"Arjun","statement":"Did anyone fix the authentication errors on staging?","time":"Tue 11:05","sourceId":"s4"}'::jsonb, '{"speaker":"System","statement":"No subsequent confirmation found across 4 connected channels.","time":"Wed 09:30","sourceId":"s4","status":"unconfirmed"}'::jsonb, 'The team may passively assume someone resolved this bug, but no record exists. Negative evidence is surfaced explicitly rather than hallucinating resolution.', 'Ask Arjun or check CI/CD error telemetry directly.', 3)
ON CONFLICT (id) DO NOTHING;

-- Seed baseline drift chart metrics
INSERT INTO public.drift_chart_metrics (id, day, divergence, alignment, risk_level, sort_order) VALUES
('dm-1', 'Mon 10:00', 8, 92, 10, 1),
('dm-2', 'Mon 17:00', 22, 78, 30, 2),
('dm-3', 'Tue 12:00', 45, 55, 58, 3),
('dm-4', 'Tue 19:00', 64, 36, 72, 4),
('dm-5', 'Wed 09:30', 78, 22, 85, 5)
ON CONFLICT (id) DO NOTHING;
