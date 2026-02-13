
-- Fix PUBLIC_DATA_EXPOSURE: Remove public SELECT policies from analytics tables
-- menu_item_statistics and menu_item_area_stats should be admin-only

DROP POLICY IF EXISTS "Everyone can view menu item statistics" ON public.menu_item_statistics;
DROP POLICY IF EXISTS "Everyone can view menu item area stats" ON public.menu_item_area_stats;

-- Replace with admin-only SELECT policies
CREATE POLICY "Admins can view menu item statistics"
ON public.menu_item_statistics
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view menu item area stats"
ON public.menu_item_area_stats
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));
