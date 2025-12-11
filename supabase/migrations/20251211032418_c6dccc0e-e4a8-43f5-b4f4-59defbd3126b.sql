-- Enable REPLICA IDENTITY FULL for orders table to ensure complete row data in realtime updates
ALTER TABLE public.orders REPLICA IDENTITY FULL;

-- Enable REPLICA IDENTITY FULL for order_items table as well
ALTER TABLE public.order_items REPLICA IDENTITY FULL;

-- Add order_items table to realtime publication (orders is already added)
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_items;