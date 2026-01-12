-- Drop the existing reject policy and recreate with proper WITH CHECK
DROP POLICY IF EXISTS "Delivery can reject pending orders" ON public.orders;

-- Create new policy that allows delivery to reject orders assigned to them
-- The USING clause checks the OLD row (before update)
-- The WITH CHECK clause checks the NEW row (after update) - we allow it since they're rejecting
CREATE POLICY "Delivery can reject pending orders" 
ON public.orders 
FOR UPDATE 
USING (
  has_role(auth.uid(), 'delivery'::app_role) AND 
  pending_delivery_acceptance = true AND 
  delivery_person_id = auth.uid()
)
WITH CHECK (
  has_role(auth.uid(), 'delivery'::app_role)
);