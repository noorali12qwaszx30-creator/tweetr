-- Drop the existing foreign key constraint
ALTER TABLE public.order_items DROP CONSTRAINT IF EXISTS order_items_menu_item_id_fkey;

-- Re-add the constraint with ON DELETE SET NULL
ALTER TABLE public.order_items 
ADD CONSTRAINT order_items_menu_item_id_fkey 
FOREIGN KEY (menu_item_id) 
REFERENCES public.menu_items(id) 
ON DELETE SET NULL;