CREATE OR REPLACE FUNCTION public.daily_reset_orders()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_total_orders INT := 0;
  v_delivered INT := 0;
  v_cancelled INT := 0;
  v_takeaway INT := 0;
  v_delivery INT := 0;
  v_revenue NUMERIC := 0;
  v_delivery_fees NUMERIC := 0;
  v_total_customers INT := 0;
  v_archived INT := 0;
  v_area_distribution JSONB;
  v_top_items JSONB;
  v_today DATE := CURRENT_DATE;
BEGIN
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'delivered'),
    COUNT(*) FILTER (WHERE status = 'cancelled'),
    COUNT(*) FILTER (WHERE type = 'takeaway'),
    COUNT(*) FILTER (WHERE type = 'delivery'),
    COALESCE(SUM(total_price)  FILTER (WHERE status = 'delivered'), 0),
    COALESCE(SUM(delivery_fee) FILTER (WHERE status = 'delivered'), 0),
    COUNT(DISTINCT customer_phone)
  INTO v_total_orders, v_delivered, v_cancelled, v_takeaway, v_delivery,
       v_revenue, v_delivery_fees, v_total_customers
  FROM public.orders;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('area', delivery_area_name, 'count', cnt)), '[]'::jsonb)
  INTO v_area_distribution
  FROM (
    SELECT COALESCE(da.name, 'بدون منطقة') AS delivery_area_name, COUNT(*) AS cnt
    FROM public.orders o
    LEFT JOIN public.delivery_areas da ON da.id = o.delivery_area_id
    WHERE o.status = 'delivered'
    GROUP BY COALESCE(da.name, 'بدون منطقة')
    ORDER BY cnt DESC
  ) sub;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('name', menu_item_name, 'quantity', total_qty)), '[]'::jsonb)
  INTO v_top_items
  FROM (
    SELECT oi.menu_item_name, SUM(oi.quantity)::int AS total_qty
    FROM public.order_items oi
    JOIN public.orders o ON o.id = oi.order_id
    WHERE o.status = 'delivered'
    GROUP BY oi.menu_item_name
    ORDER BY total_qty DESC
    LIMIT 10
  ) sub;

  INSERT INTO public.daily_statistics (
    stat_date, total_orders, completed_orders, cancelled_orders,
    takeaway_orders, delivery_orders, total_revenue, delivery_fees,
    total_customers, area_distribution, top_selling_items
  ) VALUES (
    v_today, v_total_orders, v_delivered, v_cancelled,
    v_takeaway, v_delivery, v_revenue, v_delivery_fees,
    v_total_customers, v_area_distribution, v_top_items
  )
  ON CONFLICT (stat_date) DO UPDATE SET
    total_orders = EXCLUDED.total_orders,
    completed_orders = EXCLUDED.completed_orders,
    cancelled_orders = EXCLUDED.cancelled_orders,
    takeaway_orders = EXCLUDED.takeaway_orders,
    delivery_orders = EXCLUDED.delivery_orders,
    total_revenue = EXCLUDED.total_revenue,
    delivery_fees = EXCLUDED.delivery_fees,
    total_customers = EXCLUDED.total_customers,
    area_distribution = EXCLUDED.area_distribution,
    top_selling_items = EXCLUDED.top_selling_items,
    updated_at = now();

  -- Insert orders FIRST (parent), so FK from order_items_history is satisfied
  WITH moved AS (
    INSERT INTO public.orders_history
    SELECT * FROM public.orders
    ON CONFLICT (id) DO NOTHING
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_archived FROM moved;

  INSERT INTO public.order_items_history
  SELECT oi.* FROM public.order_items oi
  WHERE oi.order_id IN (SELECT id FROM public.orders)
  ON CONFLICT (id) DO NOTHING;

  DELETE FROM public.order_items WHERE order_id IN (SELECT id FROM public.orders);
  DELETE FROM public.orders;

  ALTER SEQUENCE orders_order_number_seq RESTART WITH 1;
  UPDATE public.delivery_areas SET order_count = 0 WHERE order_count > 0;

  RETURN jsonb_build_object(
    'success', true,
    'date', v_today,
    'archived_orders', v_archived,
    'snapshot', jsonb_build_object(
      'total', v_total_orders,
      'delivered', v_delivered,
      'cancelled', v_cancelled,
      'revenue', v_revenue
    )
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.archive_old_completed_orders()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_moved INT := 0;
  v_shift_start TIMESTAMPTZ;
BEGIN
  v_shift_start := date_trunc('day', now()) + interval '11 hours';
  IF now() < v_shift_start THEN
    v_shift_start := v_shift_start - interval '1 day';
  END IF;

  WITH to_archive AS (
    SELECT id FROM public.orders
    WHERE (
      (status = 'delivered' AND delivered_at IS NOT NULL AND delivered_at < v_shift_start)
      OR
      (status = 'cancelled' AND cancelled_at IS NOT NULL AND cancelled_at < v_shift_start)
    )
  ),
  -- Insert parent rows first so FK from order_items_history is satisfied
  moved_orders AS (
    INSERT INTO public.orders_history
    SELECT o.* FROM public.orders o
    WHERE o.id IN (SELECT id FROM to_archive)
    ON CONFLICT (id) DO NOTHING
    RETURNING 1
  ),
  moved_items AS (
    INSERT INTO public.order_items_history
    SELECT oi.* FROM public.order_items oi
    WHERE oi.order_id IN (SELECT id FROM to_archive)
      AND (SELECT COUNT(*) FROM moved_orders) >= 0
    ON CONFLICT (id) DO NOTHING
    RETURNING 1
  ),
  del_items AS (
    DELETE FROM public.order_items
    WHERE order_id IN (SELECT id FROM to_archive)
      AND (SELECT COUNT(*) FROM moved_items) >= 0
    RETURNING 1
  ),
  del_orders AS (
    DELETE FROM public.orders
    WHERE id IN (SELECT id FROM to_archive)
      AND (SELECT COUNT(*) FROM del_items) >= 0
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_moved FROM del_orders;

  RETURN jsonb_build_object('moved', v_moved, 'shift_start', v_shift_start);
END;
$function$;