-- Add display_order column to menu_items for drag & drop ordering
ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS display_order integer DEFAULT 0;

-- Create index for faster ordering queries
CREATE INDEX IF NOT EXISTS idx_menu_items_display_order ON public.menu_items (category, display_order);