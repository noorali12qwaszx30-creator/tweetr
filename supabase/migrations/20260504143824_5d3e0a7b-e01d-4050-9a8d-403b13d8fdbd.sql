-- Track which orders have already been alerted to avoid duplicate notifications
CREATE TABLE IF NOT EXISTS public.delayed_order_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL UNIQUE,
  order_number INTEGER NOT NULL,
  alerted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.delayed_order_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view delayed order alerts"
ON public.delayed_order_alerts
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Enable required extensions for cron-based scheduling
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule the check every minute
SELECT cron.schedule(
  'check-delayed-orders-every-minute',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://mlframmmnctcvovqtrxm.supabase.co/functions/v1/check-delayed-orders',
    headers := jsonb_build_object('Content-Type', 'application/json')
  );
  $$
);