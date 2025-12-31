-- إزالة سياسة التحديث للمطبخ (للعرض فقط)
DROP POLICY IF EXISTS "Kitchen can update orders" ON public.orders;