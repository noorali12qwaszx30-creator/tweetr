-- Drop the user_passwords table which stores passwords in plain text
-- This is a critical security fix - passwords should never be stored in plain text
-- Supabase Auth already handles password hashing securely

DROP TABLE IF EXISTS public.user_passwords CASCADE;