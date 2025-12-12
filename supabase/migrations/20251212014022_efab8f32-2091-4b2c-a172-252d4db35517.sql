-- Add is_edited column to orders table to track edited orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS is_edited boolean DEFAULT false;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS edited_at timestamp with time zone;