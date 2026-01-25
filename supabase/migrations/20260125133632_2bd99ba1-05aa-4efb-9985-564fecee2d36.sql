-- Add indexes for faster queries on orders table
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_cashier_id ON public.orders (cashier_id);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_person_id ON public.orders (delivery_person_id);
CREATE INDEX IF NOT EXISTS idx_orders_type ON public.orders (type);
CREATE INDEX IF NOT EXISTS idx_orders_status_type ON public.orders (status, type);
CREATE INDEX IF NOT EXISTS idx_orders_status_is_archived ON public.orders (status, is_archived);