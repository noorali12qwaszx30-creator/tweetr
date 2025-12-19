-- Drop the existing overly permissive SELECT policy
DROP POLICY IF EXISTS "Authorized roles can view customers" ON public.customers;

-- Create a new restricted SELECT policy that limits access to customers associated with user's orders
-- Admins can see all customers
-- Cashiers can see customers from orders they created
-- Delivery staff can see customers from orders assigned to them
-- Field staff can see customers from orders they manage
-- Takeaway staff can see customers from takeaway orders

CREATE POLICY "Users can view customers from their orders" 
ON public.customers 
FOR SELECT 
USING (
  -- Admins can view all customers
  has_role(auth.uid(), 'admin'::app_role)
  OR
  -- Users can view customers associated with orders they are involved in
  id IN (
    SELECT DISTINCT customer_id 
    FROM public.orders 
    WHERE customer_id IS NOT NULL
    AND (
      -- Cashier can see customers from orders they created
      (has_role(auth.uid(), 'cashier'::app_role) AND cashier_id = auth.uid())
      OR
      -- Delivery staff can see customers from orders assigned to them
      (has_role(auth.uid(), 'delivery'::app_role) AND delivery_person_id = auth.uid())
      OR
      -- Field staff can see all customers (they manage order flow)
      has_role(auth.uid(), 'field'::app_role)
      OR
      -- Takeaway staff can see customers from takeaway orders
      (has_role(auth.uid(), 'takeaway'::app_role) AND type = 'takeaway'::order_type)
    )
  )
);