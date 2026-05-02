-- اختصار الإشعارات:
-- المطبخ: طلب جديد + تعديل
-- الدلفري: عند تحويل طلب له (assignment)
-- المدير: الإلغاءات
-- الكاشير + الفيلد: لا إشعارات

CREATE OR REPLACE FUNCTION public.notify_push_for_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_url TEXT := 'https://mlframmmnctcvovqtrxm.supabase.co/functions/v1/send-push-notification';
  v_payload JSONB;
  v_title TEXT;
  v_body TEXT;
  v_roles JSONB;
  v_user_ids JSONB := NULL;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- طلب جديد → للمطبخ فقط
    v_title := 'طلب جديد #' || NEW.order_number;
    v_body  := COALESCE(NEW.customer_name, '') || ' - ' || NEW.total_price::TEXT || ' د.ل';
    v_roles := '["kitchen"]'::jsonb;

  ELSIF TG_OP = 'UPDATE' THEN
    -- 1) تعديل طلب → للمطبخ
    IF COALESCE(NEW.is_edited, false) = true
       AND COALESCE(OLD.is_edited, false) = false THEN
      v_title := 'تعديل طلب #' || NEW.order_number;
      v_body  := 'تم تعديل الطلب، يرجى مراجعته';
      v_roles := '["kitchen"]'::jsonb;

    -- 2) تحويل طلب لسائق → للسائق المعيّن فقط
    ELSIF NEW.delivery_person_id IS NOT NULL
          AND (OLD.delivery_person_id IS NULL OR OLD.delivery_person_id <> NEW.delivery_person_id) THEN
      v_title := 'طلب جديد لك #' || NEW.order_number;
      v_body  := COALESCE(NEW.customer_name, '') || ' - ' || COALESCE(NEW.customer_address, '');
      v_roles := '[]'::jsonb;
      v_user_ids := jsonb_build_array(NEW.delivery_person_id::text);

    -- 3) إلغاء طلب → للمدير فقط
    ELSIF NEW.status = 'cancelled' AND OLD.status <> 'cancelled' THEN
      v_title := 'تم إلغاء طلب #' || NEW.order_number;
      v_body  := COALESCE(NEW.cancellation_reason, 'بدون سبب');
      v_roles := '["admin"]'::jsonb;

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

  IF v_user_ids IS NOT NULL THEN
    v_payload := v_payload || jsonb_build_object('target_user_ids', v_user_ids);
  END IF;

  PERFORM net.http_post(
    url := v_url,
    body := v_payload,
    headers := jsonb_build_object('Content-Type', 'application/json')
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$function$;
