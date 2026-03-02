-- Allow admins to delete customers
CREATE POLICY "Admins can delete customers"
  ON public.customers FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to delete menu_item_statistics
CREATE POLICY "Admins can delete menu_item_statistics"
  ON public.menu_item_statistics FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to delete menu_item_area_stats
CREATE POLICY "Admins can delete menu_item_area_stats"
  ON public.menu_item_area_stats FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to delete daily_statistics
CREATE POLICY "Admins can delete daily_statistics"
  ON public.daily_statistics FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to delete ai_insights
CREATE POLICY "Admins can delete ai_insights"
  ON public.ai_insights FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to delete ai_analysis_snapshots
CREATE POLICY "Admins can delete ai_analysis_snapshots"
  ON public.ai_analysis_snapshots FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));