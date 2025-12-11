-- Add RLS policy for takeaway to update takeaway orders (regardless of cashier_id)
CREATE POLICY "Takeaway can update takeaway orders" 
ON public.orders 
FOR UPDATE 
USING (has_role(auth.uid(), 'takeaway'::app_role) AND type = 'takeaway');

-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Takeaway can update own orders" ON public.orders;