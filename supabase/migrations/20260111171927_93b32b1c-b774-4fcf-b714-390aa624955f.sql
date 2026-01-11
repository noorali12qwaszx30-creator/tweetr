-- Allow delivery users to update orders that are pending their acceptance
CREATE POLICY "Delivery can reject pending orders"
ON public.orders
FOR UPDATE
USING (
  has_role(auth.uid(), 'delivery'::app_role) 
  AND pending_delivery_acceptance = true
  AND delivery_person_id = auth.uid()
);