-- Update takeaway SELECT policy to also see pickup orders
DROP POLICY IF EXISTS "Takeaway can view takeaway orders" ON public.orders;
CREATE POLICY "Takeaway can view takeaway orders"
ON public.orders FOR SELECT
USING (
  has_role(auth.uid(), 'takeaway'::app_role) 
  AND (type = 'takeaway'::order_type OR type = 'pickup'::order_type)
);

-- Update takeaway UPDATE policy to also update pickup orders
DROP POLICY IF EXISTS "Takeaway can update takeaway orders" ON public.orders;
CREATE POLICY "Takeaway can update takeaway orders"
ON public.orders FOR UPDATE
USING (
  has_role(auth.uid(), 'takeaway'::app_role) 
  AND (type = 'takeaway'::order_type OR type = 'pickup'::order_type)
);