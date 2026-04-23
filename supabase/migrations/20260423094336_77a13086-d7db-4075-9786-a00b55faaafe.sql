CREATE OR REPLACE FUNCTION public.get_top_selling_items_today(_limit integer DEFAULT 20)
RETURNS TABLE(menu_item_id uuid, menu_item_name text, total_quantity bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    oi.menu_item_id,
    oi.menu_item_name,
    SUM(oi.quantity)::bigint AS total_quantity
  FROM public.order_items oi
  JOIN public.orders o ON o.id = oi.order_id
  WHERE o.status = 'delivered'
    AND o.delivered_at >= date_trunc('day', now())
    AND o.delivered_at < date_trunc('day', now()) + interval '1 day'
  GROUP BY oi.menu_item_id, oi.menu_item_name
  ORDER BY total_quantity DESC
  LIMIT _limit;
$$;

GRANT EXECUTE ON FUNCTION public.get_top_selling_items_today(integer) TO authenticated;