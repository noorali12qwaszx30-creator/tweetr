-- Create permanent menu item statistics table
CREATE TABLE public.menu_item_statistics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  menu_item_id UUID REFERENCES public.menu_items(id) ON DELETE SET NULL,
  menu_item_name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT '',
  total_quantity_sold INTEGER NOT NULL DEFAULT 0,
  total_revenue NUMERIC NOT NULL DEFAULT 0,
  delivery_quantity INTEGER NOT NULL DEFAULT 0,
  takeaway_quantity INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(menu_item_name)
);

-- Create area breakdown for each menu item
CREATE TABLE public.menu_item_area_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  menu_item_name TEXT NOT NULL,
  delivery_area_id UUID REFERENCES public.delivery_areas(id) ON DELETE SET NULL,
  delivery_area_name TEXT NOT NULL,
  quantity_sold INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(menu_item_name, delivery_area_name)
);

-- Enable RLS
ALTER TABLE public.menu_item_statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_item_area_stats ENABLE ROW LEVEL SECURITY;

-- RLS policies - Everyone can view, only system can modify
CREATE POLICY "Everyone can view menu item statistics"
ON public.menu_item_statistics FOR SELECT
USING (true);

CREATE POLICY "Admins can manage menu item statistics"
ON public.menu_item_statistics FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Everyone can view menu item area stats"
ON public.menu_item_area_stats FOR SELECT
USING (true);

CREATE POLICY "Admins can manage menu item area stats"
ON public.menu_item_area_stats FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger to update updated_at
CREATE TRIGGER update_menu_item_statistics_updated_at
BEFORE UPDATE ON public.menu_item_statistics
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_menu_item_area_stats_updated_at
BEFORE UPDATE ON public.menu_item_area_stats
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to record menu item sale (called when order is delivered)
CREATE OR REPLACE FUNCTION public.record_menu_item_sale()
RETURNS TRIGGER AS $$
DECLARE
  item RECORD;
  area_name TEXT;
BEGIN
  -- Only process when status changes to 'delivered'
  IF NEW.status = 'delivered' AND (OLD.status IS NULL OR OLD.status != 'delivered') THEN
    -- Get delivery area name if exists
    IF NEW.delivery_area_id IS NOT NULL THEN
      SELECT name INTO area_name FROM public.delivery_areas WHERE id = NEW.delivery_area_id;
    END IF;
    
    -- Loop through order items
    FOR item IN 
      SELECT menu_item_name, menu_item_price, quantity, menu_item_id
      FROM public.order_items 
      WHERE order_id = NEW.id
    LOOP
      -- Get category from menu_items if available
      DECLARE
        item_category TEXT := '';
      BEGIN
        SELECT category INTO item_category FROM public.menu_items WHERE id = item.menu_item_id;
        item_category := COALESCE(item_category, '');
        
        -- Upsert into menu_item_statistics
        INSERT INTO public.menu_item_statistics (
          menu_item_id,
          menu_item_name,
          category,
          total_quantity_sold,
          total_revenue,
          delivery_quantity,
          takeaway_quantity
        ) VALUES (
          item.menu_item_id,
          item.menu_item_name,
          item_category,
          item.quantity,
          item.quantity * item.menu_item_price,
          CASE WHEN NEW.type = 'delivery' THEN item.quantity ELSE 0 END,
          CASE WHEN NEW.type = 'takeaway' THEN item.quantity ELSE 0 END
        )
        ON CONFLICT (menu_item_name) DO UPDATE SET
          menu_item_id = COALESCE(EXCLUDED.menu_item_id, menu_item_statistics.menu_item_id),
          category = COALESCE(NULLIF(EXCLUDED.category, ''), menu_item_statistics.category),
          total_quantity_sold = menu_item_statistics.total_quantity_sold + EXCLUDED.total_quantity_sold,
          total_revenue = menu_item_statistics.total_revenue + EXCLUDED.total_revenue,
          delivery_quantity = menu_item_statistics.delivery_quantity + EXCLUDED.delivery_quantity,
          takeaway_quantity = menu_item_statistics.takeaway_quantity + EXCLUDED.takeaway_quantity;
        
        -- Record area stats for delivery orders
        IF NEW.type = 'delivery' AND area_name IS NOT NULL THEN
          INSERT INTO public.menu_item_area_stats (
            menu_item_name,
            delivery_area_id,
            delivery_area_name,
            quantity_sold
          ) VALUES (
            item.menu_item_name,
            NEW.delivery_area_id,
            area_name,
            item.quantity
          )
          ON CONFLICT (menu_item_name, delivery_area_name) DO UPDATE SET
            quantity_sold = menu_item_area_stats.quantity_sold + EXCLUDED.quantity_sold;
        END IF;
      END;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on orders table
CREATE TRIGGER trigger_record_menu_item_sale
AFTER UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.record_menu_item_sale();