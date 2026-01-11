-- Allow delivery users to view ready orders that are waiting for assignment
CREATE POLICY "Delivery can view ready orders pending assignment"
ON public.orders
FOR SELECT
USING (
  has_role(auth.uid(), 'delivery'::app_role) 
  AND status = 'ready'::order_status 
  AND pending_delivery_acceptance = false
  AND delivery_person_id IS NULL
);