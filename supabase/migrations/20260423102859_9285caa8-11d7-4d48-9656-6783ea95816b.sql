-- Fix WARN 1: Replace permissive insert policy on driver_points
DROP POLICY IF EXISTS "System can insert points" ON public.driver_points;

-- Points are inserted only via SECURITY DEFINER trigger functions, so block direct user inserts
CREATE POLICY "Block direct points insertion"
ON public.driver_points FOR INSERT
WITH CHECK (false);

-- Fix WARN 2: Restrict listing of driver-hub bucket - only allow direct access via URL (which still works for public buckets)
-- The previous SELECT policy allowed listing all files. Replace with role-restricted listing.
DROP POLICY IF EXISTS "Driver hub images are publicly accessible" ON storage.objects;

CREATE POLICY "Authorized roles can view driver hub images"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'driver-hub' AND
  (has_role(auth.uid(), 'delivery'::app_role) OR has_role(auth.uid(), 'field'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
);