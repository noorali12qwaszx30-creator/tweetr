-- Allow admin to delete orders
CREATE POLICY "Admins can delete orders" 
ON public.orders 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admin to delete order_items
CREATE POLICY "Admins can delete order_items" 
ON public.order_items 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));