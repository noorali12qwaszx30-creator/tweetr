-- Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "Authenticated users can view orders" ON public.orders;

-- Create role-specific SELECT policies

-- Admins can view all orders
CREATE POLICY "Admins can view all orders"
ON public.orders FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Cashiers can view their own orders only
CREATE POLICY "Cashiers can view own orders"
ON public.orders FOR SELECT
USING (
  has_role(auth.uid(), 'cashier'::app_role)
  AND cashier_id = auth.uid()
);

-- Delivery staff can view orders assigned to them
CREATE POLICY "Delivery can view assigned orders"
ON public.orders FOR SELECT
USING (
  has_role(auth.uid(), 'delivery'::app_role)
  AND delivery_person_id = auth.uid()
);

-- Field staff can view all orders (they manage order flow)
CREATE POLICY "Field can view all orders"
ON public.orders FOR SELECT
USING (has_role(auth.uid(), 'field'::app_role));

-- Kitchen staff can view all orders (they prepare orders)
CREATE POLICY "Kitchen can view all orders"
ON public.orders FOR SELECT
USING (has_role(auth.uid(), 'kitchen'::app_role));

-- Takeaway staff can view takeaway orders only
CREATE POLICY "Takeaway can view takeaway orders"
ON public.orders FOR SELECT
USING (
  has_role(auth.uid(), 'takeaway'::app_role)
  AND type = 'takeaway'::order_type
);