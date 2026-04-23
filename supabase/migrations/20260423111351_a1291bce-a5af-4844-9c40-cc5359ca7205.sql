
-- 1. Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Daily reset function
CREATE OR REPLACE FUNCTION public.daily_reset_orders()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  -- Compute summary from currently active (non-archived) orders
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'delivered'),
    COUNT(*) FILTER (WHERE status = 'cancelled'),
    COUNT(*) FILTER (WHERE type = 'takeaway'),
    COUNT(*) FILTER (WHERE type = 'delivery'),
    COALESCE(SUM(total_price) FILTER (WHERE status = 'delivered'), 0),
    COALESCE(SUM(delivery_fee) FILTER (WHERE status = 'delivered'), 0),
    COUNT(DISTINCT customer_phone)
  INTO v_total_orders, v_delivered, v_cancelled, v_takeaway, v_delivery,
       v_revenue, v_delivery_fees, v_total_customers
  FROM public.orders
  WHERE is_archived = false;

  -- Area distribution
  SELECT COALESCE(jsonb_agg(jsonb_build_object('area', delivery_area_name, 'count', cnt)), '[]'::jsonb)
  INTO v_area_distribution
  FROM (
    SELECT
      COALESCE(da.name, 'بدون منطقة') AS delivery_area_name,
      COUNT(*) AS cnt
    FROM public.orders o
    LEFT JOIN public.delivery_areas da ON da.id = o.delivery_area_id
    WHERE o.is_archived = false AND o.status = 'delivered'
    GROUP BY COALESCE(da.name, 'بدون منطقة')
    ORDER BY cnt DESC
  ) sub;

  -- Top selling items
  SELECT COALESCE(jsonb_agg(jsonb_build_object('name', menu_item_name, 'quantity', total_qty)), '[]'::jsonb)
  INTO v_top_items
  FROM (
    SELECT oi.menu_item_name, SUM(oi.quantity)::int AS total_qty
    FROM public.order_items oi
    JOIN public.orders o ON o.id = oi.order_id
    WHERE o.is_archived = false AND o.status = 'delivered'
    GROUP BY oi.menu_item_name
    ORDER BY total_qty DESC
    LIMIT 10
  ) sub;

  -- Save daily snapshot (upsert by date)
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

  -- Archive all currently active orders (preserves them for stats)
  UPDATE public.orders
  SET is_archived = true, updated_at = now()
  WHERE is_archived = false;
  GET DIAGNOSTICS v_archived = ROW_COUNT;

  -- Reset order number sequence
  ALTER SEQUENCE orders_order_number_seq RESTART WITH 1;

  -- Reset per-area daily counter
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
$$;

-- 3. Add unique constraint on stat_date if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'daily_statistics_stat_date_key'
  ) THEN
    ALTER TABLE public.daily_statistics ADD CONSTRAINT daily_statistics_stat_date_key UNIQUE (stat_date);
  END IF;
END $$;

-- 4. Manual admin trigger function (callable from client)
CREATE OR REPLACE FUNCTION public.admin_trigger_daily_reset()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  RETURN public.daily_reset_orders();
END;
$$;

-- 5. Schedule the daily reset at 11:00 AM Baghdad time (08:00 UTC)
-- Remove any previous schedule with the same name
DO $$
BEGIN
  PERFORM cron.unschedule('daily-reset-orders-11am-baghdad');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'daily-reset-orders-11am-baghdad',
  '0 8 * * *',
  $cron$ SELECT public.daily_reset_orders(); $cron$
);
