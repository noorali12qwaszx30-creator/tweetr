-- =====================================================
-- DRIVER HUB - Social Network for Delivery Drivers
-- =====================================================

-- 1. Storage bucket for driver hub images
INSERT INTO storage.buckets (id, name, public)
VALUES ('driver-hub', 'driver-hub', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Driver hub images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'driver-hub');

CREATE POLICY "Drivers and field can upload driver hub images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'driver-hub' AND
  (has_role(auth.uid(), 'delivery'::app_role) OR has_role(auth.uid(), 'field'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
);

CREATE POLICY "Owners and admins can delete driver hub images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'driver-hub' AND
  (auth.uid()::text = (storage.foldername(name))[1] OR has_role(auth.uid(), 'admin'::app_role))
);

-- 2. Driver Hub Posts (التبليغات الرئيسية)
CREATE TABLE public.driver_hub_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  user_name TEXT NOT NULL,
  post_type TEXT NOT NULL, -- traffic, police, closed_road, pothole, fuel, weather, accident, tip, closed_shop, general, sos
  title TEXT,
  content TEXT NOT NULL,
  image_url TEXT,
  delivery_area_id UUID,
  delivery_area_name TEXT,
  severity TEXT NOT NULL DEFAULT 'info', -- info, warning, critical
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  is_resolved BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  thanks_count INTEGER NOT NULL DEFAULT 0,
  still_there_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_driver_hub_posts_active ON public.driver_hub_posts(is_active, created_at DESC);
CREATE INDEX idx_driver_hub_posts_area ON public.driver_hub_posts(delivery_area_id);
CREATE INDEX idx_driver_hub_posts_type ON public.driver_hub_posts(post_type);

ALTER TABLE public.driver_hub_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Drivers, field and admin can view posts"
ON public.driver_hub_posts FOR SELECT
USING (has_role(auth.uid(), 'delivery'::app_role) OR has_role(auth.uid(), 'field'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Drivers, field and admin can create posts"
ON public.driver_hub_posts FOR INSERT
WITH CHECK (
  user_id = auth.uid() AND
  (has_role(auth.uid(), 'delivery'::app_role) OR has_role(auth.uid(), 'field'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
);

CREATE POLICY "Authors, field and admin can update posts"
ON public.driver_hub_posts FOR UPDATE
USING (user_id = auth.uid() OR has_role(auth.uid(), 'field'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authors and admin can delete posts"
ON public.driver_hub_posts FOR DELETE
USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- 3. Reactions (تفاعلات: شكراً، ما زال موجود، تم الحل)
CREATE TABLE public.driver_hub_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.driver_hub_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  user_name TEXT NOT NULL,
  reaction_type TEXT NOT NULL, -- thanks, still_there, resolved
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id, reaction_type)
);

CREATE INDEX idx_reactions_post ON public.driver_hub_reactions(post_id);

ALTER TABLE public.driver_hub_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Drivers, field and admin can view reactions"
ON public.driver_hub_reactions FOR SELECT
USING (has_role(auth.uid(), 'delivery'::app_role) OR has_role(auth.uid(), 'field'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Drivers, field and admin can react"
ON public.driver_hub_reactions FOR INSERT
WITH CHECK (
  user_id = auth.uid() AND
  (has_role(auth.uid(), 'delivery'::app_role) OR has_role(auth.uid(), 'field'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
);

CREATE POLICY "Users can remove own reactions"
ON public.driver_hub_reactions FOR DELETE
USING (user_id = auth.uid());

-- 4. SOS Alerts (تنبيهات الطوارئ)
CREATE TABLE public.driver_sos_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  user_name TEXT NOT NULL,
  alert_type TEXT NOT NULL, -- car_breakdown, accident, threat, help_needed, other
  message TEXT,
  delivery_area_id UUID,
  delivery_area_name TEXT,
  status TEXT NOT NULL DEFAULT 'active', -- active, acknowledged, resolved
  acknowledged_by UUID,
  acknowledged_by_name TEXT,
  acknowledged_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sos_status ON public.driver_sos_alerts(status, created_at DESC);

ALTER TABLE public.driver_sos_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Drivers, field and admin can view SOS"
ON public.driver_sos_alerts FOR SELECT
USING (has_role(auth.uid(), 'delivery'::app_role) OR has_role(auth.uid(), 'field'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Drivers can create own SOS"
ON public.driver_sos_alerts FOR INSERT
WITH CHECK (user_id = auth.uid() AND has_role(auth.uid(), 'delivery'::app_role));

CREATE POLICY "Field, admin and owner can update SOS"
ON public.driver_sos_alerts FOR UPDATE
USING (user_id = auth.uid() OR has_role(auth.uid(), 'field'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Owner and admin can delete SOS"
ON public.driver_sos_alerts FOR DELETE
USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- 5. Driver Points (نظام النقاط)
CREATE TABLE public.driver_points (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  points INTEGER NOT NULL DEFAULT 0,
  reason TEXT NOT NULL, -- post_created, thanks_received, resolved_post, sos_helped
  related_post_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_points_user ON public.driver_points(user_id, created_at DESC);

ALTER TABLE public.driver_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Drivers, field and admin can view points"
ON public.driver_points FOR SELECT
USING (has_role(auth.uid(), 'delivery'::app_role) OR has_role(auth.uid(), 'field'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert points"
ON public.driver_points FOR INSERT
WITH CHECK (true);

-- 6. Reaction counter trigger (تحديث عداد التفاعلات + النقاط تلقائياً)
CREATE OR REPLACE FUNCTION public.handle_driver_hub_reaction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  post_owner UUID;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.reaction_type = 'thanks' THEN
      UPDATE public.driver_hub_posts SET thanks_count = thanks_count + 1 WHERE id = NEW.post_id;
      SELECT user_id INTO post_owner FROM public.driver_hub_posts WHERE id = NEW.post_id;
      IF post_owner IS NOT NULL AND post_owner != NEW.user_id THEN
        INSERT INTO public.driver_points (user_id, points, reason, related_post_id)
        VALUES (post_owner, 1, 'thanks_received', NEW.post_id);
      END IF;
    ELSIF NEW.reaction_type = 'still_there' THEN
      UPDATE public.driver_hub_posts SET still_there_count = still_there_count + 1 WHERE id = NEW.post_id;
    ELSIF NEW.reaction_type = 'resolved' THEN
      UPDATE public.driver_hub_posts 
      SET is_resolved = true, resolved_at = now(), resolved_by = NEW.user_id
      WHERE id = NEW.post_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.reaction_type = 'thanks' THEN
      UPDATE public.driver_hub_posts SET thanks_count = GREATEST(thanks_count - 1, 0) WHERE id = OLD.post_id;
    ELSIF OLD.reaction_type = 'still_there' THEN
      UPDATE public.driver_hub_posts SET still_there_count = GREATEST(still_there_count - 1, 0) WHERE id = OLD.post_id;
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_driver_hub_reaction
AFTER INSERT OR DELETE ON public.driver_hub_reactions
FOR EACH ROW EXECUTE FUNCTION public.handle_driver_hub_reaction();

-- 7. Award points on post creation
CREATE OR REPLACE FUNCTION public.award_post_creation_points()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.driver_points (user_id, points, reason, related_post_id)
  VALUES (NEW.user_id, 5, 'post_created', NEW.id);
  
  -- Auto-set expiration based on post_type
  IF NEW.expires_at IS NULL THEN
    NEW.expires_at := CASE NEW.post_type
      WHEN 'police' THEN now() + interval '3 hours'
      WHEN 'traffic' THEN now() + interval '1 hour'
      WHEN 'closed_road' THEN now() + interval '6 hours'
      WHEN 'accident' THEN now() + interval '4 hours'
      WHEN 'weather' THEN now() + interval '6 hours'
      WHEN 'pothole' THEN now() + interval '7 days'
      WHEN 'fuel' THEN now() + interval '12 hours'
      WHEN 'closed_shop' THEN now() + interval '12 hours'
      WHEN 'tip' THEN now() + interval '30 days'
      ELSE now() + interval '24 hours'
    END;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_award_post_points
BEFORE INSERT ON public.driver_hub_posts
FOR EACH ROW EXECUTE FUNCTION public.award_post_creation_points();

-- 8. Updated_at triggers
CREATE TRIGGER trg_driver_hub_posts_updated
BEFORE UPDATE ON public.driver_hub_posts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_driver_sos_alerts_updated
BEFORE UPDATE ON public.driver_sos_alerts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 9. Function to get driver total points
CREATE OR REPLACE FUNCTION public.get_driver_total_points(_user_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(points), 0)::INTEGER FROM public.driver_points WHERE user_id = _user_id;
$$;

-- 10. Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.driver_hub_posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.driver_hub_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.driver_sos_alerts;
ALTER TABLE public.driver_hub_posts REPLICA IDENTITY FULL;
ALTER TABLE public.driver_hub_reactions REPLICA IDENTITY FULL;
ALTER TABLE public.driver_sos_alerts REPLICA IDENTITY FULL;