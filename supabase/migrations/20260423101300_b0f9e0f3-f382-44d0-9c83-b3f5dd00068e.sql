-- ========================================
-- 1. جدول ملاحظات الزبائن المشتركة
-- ========================================
CREATE TABLE IF NOT EXISTS public.customer_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID,
  customer_phone TEXT NOT NULL,
  note TEXT NOT NULL,
  created_by UUID NOT NULL,
  created_by_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_notes_phone ON public.customer_notes(customer_phone);
CREATE INDEX IF NOT EXISTS idx_customer_notes_customer_id ON public.customer_notes(customer_id);

ALTER TABLE public.customer_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Delivery, field and admin can view customer notes"
ON public.customer_notes FOR SELECT
USING (
  has_role(auth.uid(), 'delivery'::app_role)
  OR has_role(auth.uid(), 'field'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Delivery, field and admin can create customer notes"
ON public.customer_notes FOR INSERT
WITH CHECK (
  created_by = auth.uid() AND (
    has_role(auth.uid(), 'delivery'::app_role)
    OR has_role(auth.uid(), 'field'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);

CREATE POLICY "Authors and admin can update customer notes"
ON public.customer_notes FOR UPDATE
USING (created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authors and admin can delete customer notes"
ON public.customer_notes FOR DELETE
USING (created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_customer_notes_updated_at
BEFORE UPDATE ON public.customer_notes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========================================
-- 2. جدول ملاحظات المناطق المشتركة
-- ========================================
CREATE TABLE IF NOT EXISTS public.area_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  delivery_area_id UUID NOT NULL,
  delivery_area_name TEXT NOT NULL,
  note TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info',
  created_by UUID NOT NULL,
  created_by_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_area_notes_area_id ON public.area_notes(delivery_area_id);

ALTER TABLE public.area_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Delivery, field and admin can view area notes"
ON public.area_notes FOR SELECT
USING (
  has_role(auth.uid(), 'delivery'::app_role)
  OR has_role(auth.uid(), 'field'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Delivery, field and admin can create area notes"
ON public.area_notes FOR INSERT
WITH CHECK (
  created_by = auth.uid() AND (
    has_role(auth.uid(), 'delivery'::app_role)
    OR has_role(auth.uid(), 'field'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);

CREATE POLICY "Authors and admin can update area notes"
ON public.area_notes FOR UPDATE
USING (created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authors and admin can delete area notes"
ON public.area_notes FOR DELETE
USING (created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_area_notes_updated_at
BEFORE UPDATE ON public.area_notes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========================================
-- 3. جدول حالة السائق
-- ========================================
CREATE TABLE IF NOT EXISTS public.driver_status (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'available',
  status_message TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.driver_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated roles can view driver status"
ON public.driver_status FOR SELECT
USING (
  has_role(auth.uid(), 'delivery'::app_role)
  OR has_role(auth.uid(), 'field'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'cashier'::app_role)
  OR has_role(auth.uid(), 'kitchen'::app_role)
);

CREATE POLICY "Drivers can insert own status"
ON public.driver_status FOR INSERT
WITH CHECK (user_id = auth.uid() AND has_role(auth.uid(), 'delivery'::app_role));

CREATE POLICY "Drivers can update own status"
ON public.driver_status FOR UPDATE
USING (user_id = auth.uid() AND has_role(auth.uid(), 'delivery'::app_role));

CREATE POLICY "Admins can manage all driver statuses"
ON public.driver_status FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_driver_status_updated_at
BEFORE UPDATE ON public.driver_status
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========================================
-- 4. جدول الملاحظات الشخصية للسائق
-- ========================================
CREATE TABLE IF NOT EXISTS public.driver_personal_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_driver_personal_notes_user ON public.driver_personal_notes(user_id);

ALTER TABLE public.driver_personal_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Drivers can view own personal notes"
ON public.driver_personal_notes FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Drivers can create own personal notes"
ON public.driver_personal_notes FOR INSERT
WITH CHECK (user_id = auth.uid() AND has_role(auth.uid(), 'delivery'::app_role));

CREATE POLICY "Drivers can update own personal notes"
ON public.driver_personal_notes FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Drivers can delete own personal notes"
ON public.driver_personal_notes FOR DELETE
USING (user_id = auth.uid());

CREATE TRIGGER update_driver_personal_notes_updated_at
BEFORE UPDATE ON public.driver_personal_notes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========================================
-- 5. تفعيل Realtime على الجداول الجديدة
-- ========================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.customer_notes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.area_notes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.driver_status;