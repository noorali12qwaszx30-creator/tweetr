
CREATE OR REPLACE FUNCTION public.archive_old_completed_orders()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_moved INT := 0;
  v_shift_start TIMESTAMPTZ;
BEGIN
  -- Current operational shift starts at 11:00 (same as daily_reset)
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
  del_orders AS (
    DELETE FROM public.orders WHERE id IN (SELECT id FROM to_archive) RETURNING 1
  )
  SELECT COUNT(*) INTO v_moved FROM del_orders;

  RETURN jsonb_build_object('moved', v_moved, 'shift_start', v_shift_start);
END;
$$;
