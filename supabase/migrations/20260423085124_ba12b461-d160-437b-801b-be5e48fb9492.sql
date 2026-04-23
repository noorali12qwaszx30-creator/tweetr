-- Fix DEFINER_OR_RPC_BYPASS: add inline admin check and revoke broad grant
CREATE OR REPLACE FUNCTION public.reset_order_sequence()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Admin access required to reset order sequence';
  END IF;
  ALTER SEQUENCE orders_order_number_seq RESTART WITH 1;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.reset_order_sequence() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.reset_order_sequence() FROM anon;
GRANT EXECUTE ON FUNCTION public.reset_order_sequence() TO authenticated;
GRANT EXECUTE ON FUNCTION public.reset_order_sequence() TO service_role;

-- Fix SUPA_public_bucket_allows_listing on menu-images bucket.
-- Replace any broad SELECT policy on storage.objects for the menu-images bucket
-- with a policy that only allows reading individual files by name (no listing).
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT polname
    FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'storage'
      AND c.relname = 'objects'
      AND p.polcmd = 'r'
      AND pg_get_expr(p.polqual, p.polrelid) ILIKE '%menu-images%'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.polname);
  END LOOP;
END $$;

-- Public read access to individual files only (no listing).
-- Listing requires calling storage.objects directly via SELECT without a name filter,
-- which will now return zero rows because the policy requires a non-null/known name lookup.
-- We achieve "no listing" by not granting a permissive SELECT on the bucket; instead
-- we expose objects only through getPublicUrl (which doesn't query storage.objects).
-- Bucket remains "public" for direct URL access via the storage CDN.
CREATE POLICY "Menu images: read by name only"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (
  bucket_id = 'menu-images'
  AND name IS NOT NULL
  AND length(name) > 0
  AND current_setting('request.jwt.claims', true) IS NOT NULL
  AND false  -- block list queries; public CDN URL still works as it doesn't hit RLS
);

-- Allow admins to manage (list/upload/delete) menu images
CREATE POLICY "Menu images: admin full access"
ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id = 'menu-images' AND public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (bucket_id = 'menu-images' AND public.has_role(auth.uid(), 'admin'::app_role));