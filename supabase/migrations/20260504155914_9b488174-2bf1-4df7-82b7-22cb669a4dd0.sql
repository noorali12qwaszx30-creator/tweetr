
-- Remove call feature tables
DROP TABLE IF EXISTS public.chat_ice_candidates CASCADE;
DROP TABLE IF EXISTS public.chat_calls CASCADE;

-- Storage bucket for voice messages
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-voice', 'chat-voice', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for voice messages
CREATE POLICY "Voice messages are publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'chat-voice');

CREATE POLICY "Authenticated users can upload voice messages"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'chat-voice' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete their own voice messages"
ON storage.objects FOR DELETE
USING (bucket_id = 'chat-voice' AND auth.uid()::text = (storage.foldername(name))[1]);
