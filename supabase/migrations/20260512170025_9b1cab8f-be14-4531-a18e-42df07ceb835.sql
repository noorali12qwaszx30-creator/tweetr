
-- 1) Create history tables (same shape as live)
CREATE TABLE IF NOT EXISTS public.orders_history (LIKE public.orders INCLUDING ALL);
CREATE TABLE IF NOT EXISTS public.order_items_history (LIKE public.order_items INCLUDING ALL);

-- 2) Indexes optimized for history reads
CREATE INDEX IF NOT EXISTS idx_orders_history_delivered_at ON public.orders_history (delivered_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_history_driver_delivered ON public.orders_history (delivery_person_id, delivered_at DESC) WHERE status = 'delivered';
CREATE INDEX IF NOT EXISTS idx_orders_history_cashier ON public.orders_history (cashier_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_history_area ON public.orders_history (delivery_area_id);
CREATE INDEX IF NOT EXISTS idx_orders_history_status ON public.orders_history (status);
CREATE INDEX IF NOT EXISTS idx_orders_history_created_at ON public.orders_history (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_history_order ON public.order_items_history (order_id);

-- 3) Enable RLS
ALTER TABLE public.orders_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items_history ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-running
DROP POLICY IF EXISTS "Admins manage orders_history" ON public.orders_history;
DROP POLICY IF EXISTS "Field can view orders_history" ON public.orders_history;
DROP POLICY IF EXISTS "Delivery can view own orders_history" ON public.orders_history;
DROP POLICY IF EXISTS "Cashier can view own orders_history" ON public.orders_history;
DROP POLICY IF EXISTS "Admins manage order_items_history" ON public.order_items_history;
DROP POLICY IF EXISTS "Roles can view related order_items_history" ON public.order_items_history;

CREATE POLICY "Admins manage orders_history" ON public.orders_history
  FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Field can view orders_history" ON public.orders_history
  FOR SELECT USING (public.has_role(auth.uid(), 'field'::app_role));

CREATE POLICY "Delivery can view own orders_history" ON public.orders_history
  FOR SELECT USING (public.has_role(auth.uid(), 'delivery'::app_role) AND delivery_person_id = auth.uid());

CREATE POLICY "Cashier can view own orders_history" ON public.orders_history
  FOR SELECT USING (public.has_role(auth.uid(), 'cashier'::app_role) AND cashier_id = auth.uid());

CREATE POLICY "Admins manage order_items_history" ON public.order_items_history
  FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Roles can view related order_items_history" ON public.order_items_history
  FOR SELECT USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'field'::app_role)
    OR order_id IN (
      SELECT id FROM public.orders_history
      WHERE (public.has_role(auth.uid(), 'delivery'::app_role) AND delivery_person_id = auth.uid())
         OR (public.has_role(auth.uid(), 'cashier'::app_role)  AND cashier_id          = auth.uid())
    )
  );

-- 4) Migrate existing archived data into history tables
INSERT INTO public.order_items_history
SELECT oi.* FROM public.order_items oi
JOIN public.orders o ON o.id = oi.order_id
WHERE o.is_archived = true
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.orders_history
SELECT * FROM public.orders WHERE is_archived = true
ON CONFLICT (id) DO NOTHING;

-- Remove migrated archived rows from live tables (items first via FK-less but logical order)
DELETE FROM public.order_items
WHERE order_id IN (SELECT id FROM public.orders WHERE is_archived = true);

DELETE FROM public.orders WHERE is_archived = true;

-- 5) Add to realtime publication for history? No — history is read-only, no need. Keep realtime light.

-- 6) Driver accounting RPC (aggregates across live + history)
CREATE OR REPLACE FUNCTION public.get_driver_accounting(
  _driver_id uuid,
  _from timestamptz DEFAULT NULL,
  _to   timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  -- Allow: admin, field, or the driver themself
  IF NOT (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'field'::app_role)
    OR auth.uid() = _driver_id
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  WITH all_orders AS (
    SELECT id, status, total_price, delivery_fee, delivered_at, cancelled_at, created_at
    FROM public.orders
    WHERE delivery_person_id = _driver_id
      AND (_from IS NULL OR created_at >= _from)
      AND (_to   IS NULL OR created_at <  _to)
    UNION ALL
    SELECT id, status, total_price, delivery_fee, delivered_at, cancelled_at, created_at
    FROM public.orders_history
    WHERE delivery_person_id = _driver_id
      AND (_from IS NULL OR created_at >= _from)
      AND (_to   IS NULL OR created_at <  _to)
  )
  SELECT jsonb_build_object(
    'delivered_count', COUNT(*) FILTER (WHERE status = 'delivered'),
    'cancelled_count', COUNT(*) FILTER (WHERE status = 'cancelled'),
    'total_collected', COALESCE(SUM(total_price)  FILTER (WHERE status = 'delivered'), 0),
    'delivery_fees',   COALESCE(SUM(delivery_fee) FILTER (WHERE status = 'delivered'), 0),
    'restaurant_due',  COALESCE(SUM(total_price - COALESCE(delivery_fee,0)) FILTER (WHERE status = 'delivered'), 0)
  ) INTO v_result FROM all_orders;

  RETURN COALESCE(v_result, '{}'::jsonb);
END;
$$;

-- 7) Admin stats range RPC
CREATE OR REPLACE FUNCTION public.get_admin_stats_range(
  _from timestamptz,
  _to   timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  WITH all_orders AS (
    SELECT status, type, total_price, delivery_fee, customer_phone
    FROM public.orders
    WHERE created_at >= _from AND created_at < _to
    UNION ALL
    SELECT status, type, total_price, delivery_fee, customer_phone
    FROM public.orders_history
    WHERE created_at >= _from AND created_at < _to
  )
  SELECT jsonb_build_object(
    'total_orders',     COUNT(*),
    'delivered',        COUNT(*) FILTER (WHERE status = 'delivered'),
    'cancelled',        COUNT(*) FILTER (WHERE status = 'cancelled'),
    'delivery_orders',  COUNT(*) FILTER (WHERE type = 'delivery'),
    'takeaway_orders',  COUNT(*) FILTER (WHERE type = 'takeaway'),
    'pickup_orders',    COUNT(*) FILTER (WHERE type = 'pickup'),
    'revenue',          COALESCE(SUM(total_price)  FILTER (WHERE status = 'delivered'), 0),
    'delivery_fees',    COALESCE(SUM(delivery_fee) FILTER (WHERE status = 'delivered'), 0),
    'unique_customers', COUNT(DISTINCT customer_phone)
  ) INTO v FROM all_orders;

  RETURN COALESCE(v, '{}'::jsonb);
END;
$$;

-- 8) Auto-archive completed orders older than 6 hours
CREATE OR REPLACE FUNCTION public.archive_old_completed_orders()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_moved INT := 0;
  v_cutoff TIMESTAMPTZ := now() - interval '6 hours';
BEGIN
  -- Move items first
  WITH to_archive AS (
    SELECT id FROM public.orders
    WHERE (
      (status = 'delivered' AND delivered_at IS NOT NULL AND delivered_at < v_cutoff)
      OR
      (status = 'cancelled' AND cancelled_at IS NOT NULL AND cancelled_at < v_cutoff)
    )
  ),
  moved_items AS (
    INSERT INTO public.order_items_history
    SELECT oi.* FROM public.order_items oi
    WHERE oi.order_id IN (SELECT id FROM to_archive)
    ON CONFLICT (id) DO NOTHING
    RETURNING 1
  ),
  moved_orders AS (
    INSERT INTO public.orders_history
    SELECT o.* FROM public.orders o
    WHERE o.id IN (SELECT id FROM to_archive)
    ON CONFLICT (id) DO NOTHING
    RETURNING 1
  ),
  del_items AS (
    DELETE FROM public.order_items WHERE order_id IN (SELECT id FROM to_archive) RETURNING 1
  ),
  del_orders AS (
    DELETE FROM public.orders WHERE id IN (SELECT id FROM to_archive) RETURNING 1
  )
  SELECT COUNT(*) INTO v_moved FROM del_orders;

  RETURN jsonb_build_object('moved', v_moved, 'cutoff', v_cutoff);
END;
$$;

-- 9) Update daily_reset_orders to MOVE to history (no more is_archived flag usage)
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
  -- Snapshot from live orders (and any not-yet-archived)
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

  -- MOVE all live orders to history (instead of just flagging)
  INSERT INTO public.order_items_history
  SELECT oi.* FROM public.order_items oi
  WHERE oi.order_id IN (SELECT id FROM public.orders)
  ON CONFLICT (id) DO NOTHING;

  WITH moved AS (
    INSERT INTO public.orders_history
    SELECT * FROM public.orders
    ON CONFLICT (id) DO NOTHING
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_archived FROM moved;

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
$$;

-- 10) Composite index for hot live-orders queries (kitchen/field)
CREATE INDEX IF NOT EXISTS idx_orders_status_created ON public.orders (status, created_at DESC);
