-- Driver live location tracking
CREATE TABLE IF NOT EXISTS public.driver_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  user_name TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  accuracy DOUBLE PRECISION,
  speed DOUBLE PRECISION,
  heading DOUBLE PRECISION,
  battery_level INTEGER,
  is_gps_enabled BOOLEAN NOT NULL DEFAULT true,
  is_charging BOOLEAN,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_driver_locations_updated ON public.driver_locations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_driver_locations_user ON public.driver_locations(user_id);

ALTER TABLE public.driver_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Drivers manage own location"
ON public.driver_locations
FOR ALL
TO authenticated
USING (user_id = auth.uid() AND has_role(auth.uid(), 'delivery'::app_role))
WITH CHECK (user_id = auth.uid() AND has_role(auth.uid(), 'delivery'::app_role));

CREATE POLICY "Field admin cashier can view driver locations"
ON public.driver_locations
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'field'::app_role) OR
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'cashier'::app_role)
);

CREATE POLICY "Admin can delete driver locations"
ON public.driver_locations
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

ALTER TABLE public.driver_locations REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.driver_locations;
