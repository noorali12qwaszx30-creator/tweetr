-- Drop the existing overly permissive policies
DROP POLICY IF EXISTS "Authenticated users can manage order items" ON public.order_items;
DROP POLICY IF EXISTS "Authenticated users can view order items" ON public.order_items;

-- Create restricted SELECT policy - users can only view order items from orders they're involved in
CREATE POLICY "Users can view order items from their orders" 
ON public.order_items 
FOR SELECT 
USING (
  -- Admins can view all order items
  has_role(auth.uid(), 'admin'::app_role)
  OR
  -- Users can view order items from orders they're involved in
  order_id IN (
    SELECT id FROM public.orders 
    WHERE 
      -- Cashier can see items from orders they created
      (has_role(auth.uid(), 'cashier'::app_role) AND cashier_id = auth.uid())
      OR
      -- Delivery staff can see items from orders assigned to them
      (has_role(auth.uid(), 'delivery'::app_role) AND delivery_person_id = auth.uid())
      OR
      -- Field staff can see all order items (they manage order flow)
      has_role(auth.uid(), 'field'::app_role)
      OR
      -- Kitchen staff can see all order items (they prepare orders)
      has_role(auth.uid(), 'kitchen'::app_role)
      OR
      -- Takeaway staff can see items from takeaway orders
      (has_role(auth.uid(), 'takeaway'::app_role) AND type = 'takeaway'::order_type)
  )
);

-- Create INSERT policy - only cashiers, takeaway, and admins can add order items
CREATE POLICY "Authorized roles can create order items" 
ON public.order_items 
FOR INSERT 
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR
  has_role(auth.uid(), 'cashier'::app_role)
  OR
  has_role(auth.uid(), 'takeaway'::app_role)
);

-- Create UPDATE policy - users can only update order items from orders they're involved in
CREATE POLICY "Users can update order items from their orders" 
ON public.order_items 
FOR UPDATE 
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR
  order_id IN (
    SELECT id FROM public.orders 
    WHERE 
      (has_role(auth.uid(), 'cashier'::app_role) AND cashier_id = auth.uid())
      OR
      (has_role(auth.uid(), 'takeaway'::app_role) AND type = 'takeaway'::order_type)
  )
);