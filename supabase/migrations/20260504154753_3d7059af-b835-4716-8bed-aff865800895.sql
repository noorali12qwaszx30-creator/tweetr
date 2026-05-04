
-- ICE candidates table (separate to avoid update races)
CREATE TABLE public.chat_ice_candidates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  call_id uuid NOT NULL REFERENCES public.chat_calls(id) ON DELETE CASCADE,
  from_role text NOT NULL CHECK (from_role IN ('caller','callee')),
  candidate jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_chat_ice_candidates_call ON public.chat_ice_candidates(call_id);

ALTER TABLE public.chat_ice_candidates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Caller and callee insert candidates"
ON public.chat_ice_candidates FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.chat_calls c
    WHERE c.id = call_id
      AND (c.caller_id = auth.uid() OR c.callee_id = auth.uid())
  )
);

CREATE POLICY "Caller and callee view candidates"
ON public.chat_ice_candidates FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.chat_calls c
    WHERE c.id = call_id
      AND (c.caller_id = auth.uid() OR c.callee_id = auth.uid())
  )
);

ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_ice_candidates;
ALTER TABLE public.chat_ice_candidates REPLICA IDENTITY FULL;

-- Heartbeat columns on chat_calls
ALTER TABLE public.chat_calls
  ADD COLUMN IF NOT EXISTS caller_last_ping_at timestamptz,
  ADD COLUMN IF NOT EXISTS callee_last_ping_at timestamptz;
