-- Add policy for delivery to view orders pending their acceptance
CREATE POLICY "Delivery can view pending acceptance orders" 
ON public.orders 
FOR SELECT 
USING (
  has_role(auth.uid(), 'delivery'::app_role) AND 
  pending_delivery_acceptance = true AND 
  delivery_person_id = auth.uid()
);