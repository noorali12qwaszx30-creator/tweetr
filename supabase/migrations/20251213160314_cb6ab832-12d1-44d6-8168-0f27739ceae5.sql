-- Create a function to reset the order number sequence
CREATE OR REPLACE FUNCTION public.reset_order_sequence()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Reset the sequence to 1
  ALTER SEQUENCE orders_order_number_seq RESTART WITH 1;
END;
$$;

-- Grant execute permission to authenticated users (the edge function will check for admin role)
GRANT EXECUTE ON FUNCTION public.reset_order_sequence() TO authenticated;
GRANT EXECUTE ON FUNCTION public.reset_order_sequence() TO service_role;