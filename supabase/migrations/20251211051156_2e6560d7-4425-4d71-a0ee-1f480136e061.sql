-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can update orders" ON public.orders;

-- Admins can update everything
CREATE POLICY "Admins can update orders"
ON public.orders FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Cashiers can update their own orders
CREATE POLICY "Cashiers can update own orders"
ON public.orders FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'cashier')
  AND cashier_id = auth.uid()
);

-- Takeaway can update their own orders
CREATE POLICY "Takeaway can update own orders"
ON public.orders FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'takeaway')
  AND cashier_id = auth.uid()
);

-- Field staff can update orders (for assignment and status changes)
CREATE POLICY "Field can update orders"
ON public.orders FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'field'));

-- Delivery personnel can update their assigned orders
CREATE POLICY "Delivery can update assigned orders"
ON public.orders FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'delivery')
  AND delivery_person_id = auth.uid()
);

-- Kitchen can update order status
CREATE POLICY "Kitchen can update orders"
ON public.orders FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'kitchen'));