
-- Conversations table
CREATE TABLE public.chat_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('private', 'group', 'role_group')),
  name TEXT,
  role_filter TEXT,
  created_by UUID,
  last_message_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Participants
CREATE TABLE public.chat_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  last_read_at TIMESTAMPTZ DEFAULT now(),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);
CREATE INDEX idx_chat_participants_user ON public.chat_participants(user_id);
CREATE INDEX idx_chat_participants_conv ON public.chat_participants(conversation_id);

-- Messages
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  sender_name TEXT NOT NULL,
  sender_role TEXT,
  content TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'call_event', 'system')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_chat_messages_conv ON public.chat_messages(conversation_id, created_at DESC);

-- Calls
CREATE TABLE public.chat_calls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  caller_id UUID NOT NULL,
  caller_name TEXT NOT NULL,
  callee_id UUID NOT NULL,
  callee_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ringing' CHECK (status IN ('ringing', 'accepted', 'rejected', 'ended', 'missed', 'cancelled')),
  webrtc_offer JSONB,
  webrtc_answer JSONB,
  ice_candidates JSONB DEFAULT '[]'::jsonb,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  answered_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration_seconds INT
);
CREATE INDEX idx_chat_calls_caller ON public.chat_calls(caller_id, started_at DESC);
CREATE INDEX idx_chat_calls_callee ON public.chat_calls(callee_id, started_at DESC);

-- Presence
CREATE TABLE public.user_presence (
  user_id UUID NOT NULL PRIMARY KEY,
  user_name TEXT NOT NULL,
  user_role TEXT,
  status TEXT NOT NULL DEFAULT 'online' CHECK (status IN ('online', 'offline', 'away')),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Updated-at triggers
CREATE TRIGGER update_chat_conversations_updated_at
  BEFORE UPDATE ON public.chat_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_presence_updated_at
  BEFORE UPDATE ON public.user_presence
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Helper: is user a participant?
CREATE OR REPLACE FUNCTION public.is_chat_participant(_conversation_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chat_participants
    WHERE conversation_id = _conversation_id AND user_id = _user_id
  );
$$;

-- Trigger to bump last_message_at
CREATE OR REPLACE FUNCTION public.bump_conversation_last_message()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE public.chat_conversations
    SET last_message_at = NEW.created_at, updated_at = now()
    WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER bump_conv_last_msg
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.bump_conversation_last_message();

-- Enable RLS
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;

-- Conversations policies
CREATE POLICY "Users view their conversations"
  ON public.chat_conversations FOR SELECT
  USING (has_role(auth.uid(), 'admin') OR public.is_chat_participant(id, auth.uid()));

CREATE POLICY "Authenticated can create conversations"
  ON public.chat_conversations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins manage conversations"
  ON public.chat_conversations FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Participants policies
CREATE POLICY "Users view participants of their conversations"
  ON public.chat_participants FOR SELECT
  USING (
    has_role(auth.uid(), 'admin')
    OR user_id = auth.uid()
    OR public.is_chat_participant(conversation_id, auth.uid())
  );

CREATE POLICY "Users can join (insert) participants"
  ON public.chat_participants FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users update own participation"
  ON public.chat_participants FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Admins delete participants"
  ON public.chat_participants FOR DELETE
  USING (has_role(auth.uid(), 'admin') OR user_id = auth.uid());

-- Messages policies
CREATE POLICY "Participants view messages"
  ON public.chat_messages FOR SELECT
  USING (has_role(auth.uid(), 'admin') OR public.is_chat_participant(conversation_id, auth.uid()));

CREATE POLICY "Participants send messages"
  ON public.chat_messages FOR INSERT
  WITH CHECK (sender_id = auth.uid() AND public.is_chat_participant(conversation_id, auth.uid()));

CREATE POLICY "Senders delete own messages"
  ON public.chat_messages FOR DELETE
  USING (sender_id = auth.uid() OR has_role(auth.uid(), 'admin'));

-- Calls policies
CREATE POLICY "Caller and callee view calls"
  ON public.chat_calls FOR SELECT
  USING (caller_id = auth.uid() OR callee_id = auth.uid() OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can initiate calls"
  ON public.chat_calls FOR INSERT
  WITH CHECK (caller_id = auth.uid());

CREATE POLICY "Caller and callee update call"
  ON public.chat_calls FOR UPDATE
  USING (caller_id = auth.uid() OR callee_id = auth.uid());

-- Presence policies
CREATE POLICY "All authenticated view presence"
  ON public.user_presence FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users upsert own presence"
  ON public.user_presence FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own presence"
  ON public.user_presence FOR UPDATE
  USING (user_id = auth.uid());

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_calls;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_presence;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_participants;

ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;
ALTER TABLE public.chat_calls REPLICA IDENTITY FULL;
ALTER TABLE public.chat_conversations REPLICA IDENTITY FULL;
ALTER TABLE public.user_presence REPLICA IDENTITY FULL;
ALTER TABLE public.chat_participants REPLICA IDENTITY FULL;

-- Seed default groups
INSERT INTO public.chat_conversations (id, type, name, role_filter)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'role_group', 'الجميع', 'all'),
  ('00000000-0000-0000-0000-000000000002', 'role_group', 'السائقون', 'delivery'),
  ('00000000-0000-0000-0000-000000000003', 'role_group', 'المطبخ والكاشير', 'kitchen_cashier');
