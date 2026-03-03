
-- Create the trigger on auth.users to auto-create profiles
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert missing profiles for existing auth users
INSERT INTO public.profiles (user_id, username, full_name)
SELECT 
  u.id,
  COALESCE(u.raw_user_meta_data->>'username', u.email),
  u.raw_user_meta_data->>'full_name'
FROM auth.users u
LEFT JOIN public.profiles p ON p.user_id = u.id
WHERE p.id IS NULL;
