CREATE TABLE public.generation_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL,
  prompt text NOT NULL,
  image_url text NOT NULL,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.generation_history TO authenticated;
GRANT ALL ON public.generation_history TO service_role;

ALTER TABLE public.generation_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own history"
  ON public.generation_history FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins view all history"
  ON public.generation_history FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users insert own history"
  ON public.generation_history FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users delete own history"
  ON public.generation_history FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX idx_generation_history_user_created
  ON public.generation_history (user_id, created_at DESC);

ALTER TABLE public.generation_history REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.generation_history;