-- Create order status enum
CREATE TYPE public.order_status AS ENUM ('pending', 'preparing', 'ready', 'delivering', 'delivered', 'cancelled');

-- Create order type enum
CREATE TYPE public.order_type AS ENUM ('delivery', 'takeaway');

-- Create customers table
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create menu_items table
CREATE TABLE public.menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  image TEXT,
  category TEXT NOT NULL,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create orders table
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number SERIAL,
  customer_id UUID REFERENCES public.customers(id),
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_address TEXT,
  status order_status NOT NULL DEFAULT 'pending',
  type order_type NOT NULL DEFAULT 'delivery',
  notes TEXT,
  total_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  cashier_id UUID REFERENCES auth.users(id),
  cashier_name TEXT,
  delivery_person_id UUID REFERENCES auth.users(id),
  delivery_person_name TEXT,
  pending_delivery_acceptance BOOLEAN DEFAULT false,
  cancellation_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  delivered_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE
);

-- Create order_items table
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  menu_item_id UUID REFERENCES public.menu_items(id),
  menu_item_name TEXT NOT NULL,
  menu_item_price DECIMAL(10, 2) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Customers policies (authenticated users can manage)
CREATE POLICY "Authenticated users can view customers"
ON public.customers FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create customers"
ON public.customers FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update customers"
ON public.customers FOR UPDATE
TO authenticated
USING (true);

-- Menu items policies (everyone can view, admins can manage)
CREATE POLICY "Everyone can view menu items"
ON public.menu_items FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage menu items"
ON public.menu_items FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Orders policies
CREATE POLICY "Authenticated users can view orders"
ON public.orders FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Cashiers and admins can create orders"
ON public.orders FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'cashier') OR 
  public.has_role(auth.uid(), 'takeaway') OR
  public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Authenticated users can update orders"
ON public.orders FOR UPDATE
TO authenticated
USING (true);

-- Order items policies
CREATE POLICY "Authenticated users can view order items"
ON public.order_items FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can manage order items"
ON public.order_items FOR ALL
TO authenticated
USING (true);

-- Triggers for updated_at
CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_menu_items_updated_at
  BEFORE UPDATE ON public.menu_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to update order timestamps on status change
CREATE OR REPLACE FUNCTION public.handle_order_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'delivered' AND OLD.status != 'delivered' THEN
    NEW.delivered_at = now();
  END IF;
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    NEW.cancelled_at = now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_order_status_change
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.handle_order_status_change();

-- Enable realtime for orders
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER TABLE public.orders REPLICA IDENTITY FULL;

-- Insert default menu items
INSERT INTO public.menu_items (name, price, category, image) VALUES
  ('برجر كلاسيك', 5000, 'برجر', '/placeholder.svg'),
  ('برجر دجاج', 4500, 'برجر', '/placeholder.svg'),
  ('برجر لحم', 6000, 'برجر', '/placeholder.svg'),
  ('بيتزا مارغريتا', 8000, 'بيتزا', '/placeholder.svg'),
  ('بيتزا خضار', 9000, 'بيتزا', '/placeholder.svg'),
  ('بيتزا لحم', 12000, 'بيتزا', '/placeholder.svg'),
  ('شاورما لحم', 3500, 'شاورما', '/placeholder.svg'),
  ('شاورما دجاج', 3000, 'شاورما', '/placeholder.svg'),
  ('بطاطس', 2000, 'جانبيات', '/placeholder.svg'),
  ('كولا', 1000, 'مشروبات', '/placeholder.svg'),
  ('عصير برتقال', 1500, 'مشروبات', '/placeholder.svg'),
  ('ماء', 500, 'مشروبات', '/placeholder.svg');