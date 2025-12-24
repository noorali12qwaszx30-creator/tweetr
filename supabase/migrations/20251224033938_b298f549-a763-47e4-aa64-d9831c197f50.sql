-- Add delivery_fee column to delivery_areas table
ALTER TABLE public.delivery_areas 
ADD COLUMN delivery_fee numeric NOT NULL DEFAULT 0;

-- Add delivery_fee column to orders table to store the fee at time of order
ALTER TABLE public.orders 
ADD COLUMN delivery_fee numeric NOT NULL DEFAULT 0;

-- Add comment for clarity
COMMENT ON COLUMN public.delivery_areas.delivery_fee IS 'Delivery fee for this area in local currency';
COMMENT ON COLUMN public.orders.delivery_fee IS 'Delivery fee charged for this order';