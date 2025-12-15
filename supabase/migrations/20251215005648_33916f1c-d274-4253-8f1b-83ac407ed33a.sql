-- Add is_archived column to orders table for soft delete/archiving
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false;

-- Create index for faster queries filtering archived orders
CREATE INDEX IF NOT EXISTS idx_orders_is_archived ON public.orders(is_archived);