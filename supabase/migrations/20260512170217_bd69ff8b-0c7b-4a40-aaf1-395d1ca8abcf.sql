
ALTER TABLE public.order_items_history
  ADD CONSTRAINT order_items_history_order_id_fkey
  FOREIGN KEY (order_id) REFERENCES public.orders_history(id) ON DELETE CASCADE;
