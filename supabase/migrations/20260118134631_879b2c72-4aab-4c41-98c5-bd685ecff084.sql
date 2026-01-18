-- Add index on order_items.order_id for faster joins
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);

-- Add index on orders.is_archived for faster filtering
CREATE INDEX IF NOT EXISTS idx_orders_is_archived ON public.orders(is_archived);

-- Add index on orders.created_at for faster ordering
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);