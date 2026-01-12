-- Add issue reporting columns to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS has_issue boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS issue_reason text,
ADD COLUMN IF NOT EXISTS issue_reported_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS issue_reported_by text;

-- Create index for faster querying of orders with issues
CREATE INDEX IF NOT EXISTS idx_orders_has_issue ON public.orders(has_issue) WHERE has_issue = true;

-- Update RLS policy to allow delivery to update issue columns on their assigned orders
CREATE POLICY "Delivery can report issues on assigned orders"
ON public.orders
FOR UPDATE
USING (
  has_role(auth.uid(), 'delivery'::app_role) 
  AND delivery_person_id = auth.uid()
  AND status = 'delivering'::order_status
)
WITH CHECK (
  has_role(auth.uid(), 'delivery'::app_role)
);