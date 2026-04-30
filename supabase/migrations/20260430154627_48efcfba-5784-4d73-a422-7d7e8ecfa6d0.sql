-- Enable pg_net for HTTP calls from triggers
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Function to call the push edge function
CREATE OR REPLACE FUNCTION public.notify_push_for_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_url TEXT := 'https://mlframmmnctcvovqtrxm.supabase.co/functions/v1/send-push-notification';
  v_payload JSONB;
  v_title TEXT;
  v_body TEXT;
  v_roles JSONB;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- New order arrived
    v_title := 'طلب جديد #' || NEW.order_number;
    v_body := COALESCE(NEW.customer_name, '') || ' - ' || NEW.total_price::TEXT || ' د.ل';
    v_roles := '["kitchen","cashier","admin"]'::jsonb;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Status changes
    IF NEW.status = OLD.status THEN
      RETURN NEW;
    END IF;

    IF NEW.status = 'ready' THEN
      v_title := 'طلب جاهز #' || NEW.order_number;
      v_body := 'الطلب جاهز للتوصيل';
      v_roles := '["delivery","field","admin"]'::jsonb;
    ELSIF NEW.status = 'delivering' THEN
      v_title := 'تم استلام الطلب #' || NEW.order_number;
      v_body := COALESCE(NEW.delivery_person_name, 'سائق') || ' في الطريق';
      v_roles := '["field","admin"]'::jsonb;
    ELSE
      RETURN NEW;
    END IF;
  ELSE
    RETURN NEW;
  END IF;

  v_payload := jsonb_build_object(
    'target_roles', v_roles,
    'title', v_title,
    'body', v_body,
    'data', jsonb_build_object(
      'order_id', NEW.id::text,
      'order_number', NEW.order_number::text,
      'status', NEW.status::text
    )
  );

  PERFORM net.http_post(
    url := v_url,
    body := v_payload,
    headers := jsonb_build_object('Content-Type', 'application/json')
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never block the order operation due to push failure
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_push_order_insert ON public.orders;
CREATE TRIGGER trg_notify_push_order_insert
AFTER INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.notify_push_for_order();

DROP TRIGGER IF EXISTS trg_notify_push_order_update ON public.orders;
CREATE TRIGGER trg_notify_push_order_update
AFTER UPDATE OF status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.notify_push_for_order();