
-- Backfill: add all existing users to the appropriate group conversations
INSERT INTO public.chat_participants (conversation_id, user_id)
SELECT '00000000-0000-0000-0000-000000000001'::uuid, ur.user_id
FROM public.user_roles ur
ON CONFLICT DO NOTHING;

INSERT INTO public.chat_participants (conversation_id, user_id)
SELECT '00000000-0000-0000-0000-000000000002'::uuid, ur.user_id
FROM public.user_roles ur
WHERE ur.role = 'delivery'
ON CONFLICT DO NOTHING;

INSERT INTO public.chat_participants (conversation_id, user_id)
SELECT '00000000-0000-0000-0000-000000000003'::uuid, ur.user_id
FROM public.user_roles ur
WHERE ur.role IN ('kitchen','cashier')
ON CONFLICT DO NOTHING;

-- Add unique constraint to prevent duplicate participants
DO $$ BEGIN
  ALTER TABLE public.chat_participants
    ADD CONSTRAINT chat_participants_unique_conv_user UNIQUE (conversation_id, user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Trigger function: auto-add a user to relevant group chats when their role is assigned
CREATE OR REPLACE FUNCTION public.auto_add_user_to_chat_groups()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Add to "Everyone" group
  INSERT INTO public.chat_participants (conversation_id, user_id)
  VALUES ('00000000-0000-0000-0000-000000000001'::uuid, NEW.user_id)
  ON CONFLICT DO NOTHING;

  -- Drivers group
  IF NEW.role = 'delivery' THEN
    INSERT INTO public.chat_participants (conversation_id, user_id)
    VALUES ('00000000-0000-0000-0000-000000000002'::uuid, NEW.user_id)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Kitchen & Cashier group
  IF NEW.role IN ('kitchen','cashier') THEN
    INSERT INTO public.chat_participants (conversation_id, user_id)
    VALUES ('00000000-0000-0000-0000-000000000003'::uuid, NEW.user_id)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_add_user_to_chat_groups ON public.user_roles;
CREATE TRIGGER trg_auto_add_user_to_chat_groups
AFTER INSERT ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.auto_add_user_to_chat_groups();
