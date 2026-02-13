
-- Fix orders SELECT policies to be PERMISSIVE
DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;
DROP POLICY IF EXISTS "Cashiers can view own orders" ON public.orders;
DROP POLICY IF EXISTS "Delivery can view assigned orders" ON public.orders;
DROP POLICY IF EXISTS "Field can view all orders" ON public.orders;
DROP POLICY IF EXISTS "Kitchen can view all orders" ON public.orders;
DROP POLICY IF EXISTS "Takeaway can view takeaway orders" ON public.orders;
DROP POLICY IF EXISTS "Delivery can view ready orders pending assignment" ON public.orders;
DROP POLICY IF EXISTS "Delivery can view pending acceptance orders" ON public.orders;

CREATE POLICY "Admins can view all orders" ON public.orders AS PERMISSIVE FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Cashiers can view own orders" ON public.orders AS PERMISSIVE FOR SELECT USING (has_role(auth.uid(), 'cashier'::app_role) AND cashier_id = auth.uid());
CREATE POLICY "Delivery can view assigned orders" ON public.orders AS PERMISSIVE FOR SELECT USING (has_role(auth.uid(), 'delivery'::app_role) AND delivery_person_id = auth.uid());
CREATE POLICY "Field can view all orders" ON public.orders AS PERMISSIVE FOR SELECT USING (has_role(auth.uid(), 'field'::app_role));
CREATE POLICY "Kitchen can view all orders" ON public.orders AS PERMISSIVE FOR SELECT USING (has_role(auth.uid(), 'kitchen'::app_role));
CREATE POLICY "Takeaway can view takeaway orders" ON public.orders AS PERMISSIVE FOR SELECT USING (has_role(auth.uid(), 'takeaway'::app_role) AND type = 'takeaway'::order_type);
CREATE POLICY "Delivery can view ready orders pending assignment" ON public.orders AS PERMISSIVE FOR SELECT USING (has_role(auth.uid(), 'delivery'::app_role) AND status = 'ready'::order_status AND pending_delivery_acceptance = false AND delivery_person_id IS NULL);
CREATE POLICY "Delivery can view pending acceptance orders" ON public.orders AS PERMISSIVE FOR SELECT USING (has_role(auth.uid(), 'delivery'::app_role) AND pending_delivery_acceptance = true AND delivery_person_id = auth.uid());

-- Fix order_items SELECT policy to be PERMISSIVE
DROP POLICY IF EXISTS "Users can view order items from their orders" ON public.order_items;
CREATE POLICY "Users can view order items from their orders" ON public.order_items AS PERMISSIVE FOR SELECT USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  (order_id IN (
    SELECT orders.id FROM orders
    WHERE (
      (has_role(auth.uid(), 'cashier'::app_role) AND orders.cashier_id = auth.uid()) OR
      (has_role(auth.uid(), 'delivery'::app_role) AND orders.delivery_person_id = auth.uid()) OR
      has_role(auth.uid(), 'field'::app_role) OR
      has_role(auth.uid(), 'kitchen'::app_role) OR
      (has_role(auth.uid(), 'takeaway'::app_role) AND orders.type = 'takeaway'::order_type)
    )
  ))
);
