-- Create delivery_areas table to store predefined addresses/areas
CREATE TABLE public.delivery_areas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  order_count INTEGER NOT NULL DEFAULT 0,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.delivery_areas ENABLE ROW LEVEL SECURITY;

-- Everyone can view active delivery areas
CREATE POLICY "Everyone can view active delivery areas"
ON public.delivery_areas
FOR SELECT
USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role));

-- Only admins can manage delivery areas
CREATE POLICY "Admins can manage delivery areas"
ON public.delivery_areas
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add delivery_area_id to orders table for analytics
ALTER TABLE public.orders ADD COLUMN delivery_area_id UUID REFERENCES public.delivery_areas(id);

-- Create index for faster analytics queries
CREATE INDEX idx_orders_delivery_area_id ON public.orders(delivery_area_id);

-- Create trigger to update order_count when order is created
CREATE OR REPLACE FUNCTION public.update_delivery_area_order_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.delivery_area_id IS NOT NULL THEN
    UPDATE public.delivery_areas
    SET order_count = order_count + 1
    WHERE id = NEW.delivery_area_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_order_created_update_area_count
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_delivery_area_order_count();

-- Create trigger for updated_at
CREATE TRIGGER update_delivery_areas_updated_at
  BEFORE UPDATE ON public.delivery_areas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();