import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  image: string | null;
  category: string;
  is_available: boolean;
  display_order: number;
}

export function useMenuItems() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<string[]>([]);

  const fetchMenuItems = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('menu_items')
      .select('*')
      .order('category')
      .order('name');

    if (error) {
      console.error('Error fetching menu items:', error);
      toast.error('حدث خطأ في جلب القائمة');
      return;
    }

    setMenuItems(data as MenuItem[]);
    
    // Extract unique categories
    const uniqueCategories = [...new Set(data.map(item => item.category))];
    setCategories(uniqueCategories);
    setLoading(false);
  };

  useEffect(() => {
    fetchMenuItems();
  }, []);

  const addMenuItem = async (item: Omit<MenuItem, 'id' | 'is_available' | 'display_order'>) => {
    // Get the max display_order for this category
    const { data: maxOrderData } = await supabase
      .from('menu_items')
      .select('display_order')
      .eq('category', item.category)
      .order('display_order', { ascending: false })
      .limit(1);
    
    const maxOrder = maxOrderData?.[0]?.display_order ?? -1;

    const { data, error } = await supabase
      .from('menu_items')
      .insert({
        name: item.name,
        price: item.price,
        image: item.image,
        category: item.category,
        is_available: true,
        display_order: maxOrder + 1,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding menu item:', error);
      toast.error('حدث خطأ في إضافة الصنف');
      return null;
    }

    toast.success('تم إضافة الصنف');
    fetchMenuItems();
    return data;
  };

  const updateMenuItem = async (id: string, updates: Partial<MenuItem>) => {
    const { error } = await supabase
      .from('menu_items')
      .update(updates)
      .eq('id', id);

    if (error) {
      console.error('Error updating menu item:', error);
      toast.error('حدث خطأ في تحديث الصنف');
      return false;
    }

    toast.success('تم تحديث الصنف');
    fetchMenuItems();
    return true;
  };

  const deleteMenuItem = async (id: string) => {
    const { error } = await supabase
      .from('menu_items')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting menu item:', error);
      toast.error('حدث خطأ في حذف الصنف');
      return false;
    }

    toast.success('تم حذف الصنف');
    fetchMenuItems();
    return true;
  };

  const toggleAvailability = async (id: string, isAvailable: boolean) => {
    return updateMenuItem(id, { is_available: isAvailable });
  };

  const getAvailableItems = () => menuItems.filter(item => item.is_available);

  const getItemsByCategory = (category: string) => 
    menuItems.filter(item => item.category === category && item.is_available);

  return {
    menuItems,
    categories,
    loading,
    addMenuItem,
    updateMenuItem,
    deleteMenuItem,
    toggleAvailability,
    getAvailableItems,
    getItemsByCategory,
    refetch: fetchMenuItems,
  };
}
