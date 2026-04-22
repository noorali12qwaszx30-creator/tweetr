import { useState, useEffect, useCallback } from 'react';
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

const STORAGE_KEY = 'cached_menu_items_v2';
const STORAGE_TS_KEY = 'cached_menu_items_v2_ts';
const LEGACY_STORAGE_KEY = 'cached_menu_items';
const LEGACY_STORAGE_TS_KEY = 'cached_menu_items_ts';
const SELECT_COLS = 'id, name, price, image, category, is_available, display_order';

// Clear bloated legacy cache (which may contain large base64 images)
try {
  localStorage.removeItem(LEGACY_STORAGE_KEY);
  localStorage.removeItem(LEGACY_STORAGE_TS_KEY);
} catch {
  // ignore
}

// Load from localStorage on module init
function loadFromStorage(): { items: MenuItem[] | null; categories: string[] | null } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { items: null, categories: null };
    const items: MenuItem[] = JSON.parse(raw);
    const categories = [...new Set(items.map(i => i.category))];
    return { items, categories };
  } catch {
    return { items: null, categories: null };
  }
}

function saveToStorage(items: MenuItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    localStorage.setItem(STORAGE_TS_KEY, Date.now().toString());
  } catch {
    // Storage full or unavailable
  }
}

// Module-level memory cache (survives navigation, lost on refresh)
let cachedMenuItems: MenuItem[] | null = null;
let cachedCategories: string[] | null = null;

// Initialize memory cache from localStorage
const stored = loadFromStorage();
if (stored.items) {
  cachedMenuItems = stored.items;
  cachedCategories = stored.categories;
}

// Preload function - call early (e.g. after login) to warm cache
export async function preloadMenuItems() {
  const { data, error } = await supabase
    .from('menu_items')
    .select(SELECT_COLS)
    .order('category')
    .order('display_order');

  if (!error && data) {
    const items = data as MenuItem[];
    cachedMenuItems = items;
    cachedCategories = [...new Set(items.map(i => i.category))];
    saveToStorage(items);
  }
}

export function useMenuItems() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>(cachedMenuItems || []);
  const [loading, setLoading] = useState(cachedMenuItems === null);
  const [categories, setCategories] = useState<string[]>(cachedCategories || []);

  const fetchMenuItems = useCallback(async () => {
    if (!cachedMenuItems) {
      setLoading(true);
    }
    
    const { data, error } = await supabase
      .from('menu_items')
      .select(SELECT_COLS)
      .order('category')
      .order('display_order');

    if (error) {
      console.error('Error fetching menu items:', error);
      if (!cachedMenuItems) {
        toast.error('حدث خطأ في جلب القائمة');
      }
      setLoading(false);
      return;
    }

    const items = data as MenuItem[];
    const uniqueCategories = [...new Set(data.map(item => item.category))];
    
    cachedMenuItems = items;
    cachedCategories = uniqueCategories;
    saveToStorage(items);
    
    setMenuItems(items);
    setCategories(uniqueCategories);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchMenuItems();
    
    const channel = supabase
      .channel('menu-items-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'menu_items' },
        () => {
          fetchMenuItems();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchMenuItems]);

  const addMenuItem = async (item: Omit<MenuItem, 'id' | 'is_available' | 'display_order'>) => {
    const tempId = `temp-${Date.now()}`;
    const newItem: MenuItem = {
      id: tempId,
      ...item,
      is_available: true,
      display_order: menuItems.length,
    };
    setMenuItems(prev => [...prev, newItem]);

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
      setMenuItems(prev => prev.filter(i => i.id !== tempId));
      return null;
    }

    toast.success('تم إضافة الصنف');
    const updated = menuItems.map(i => i.id === tempId ? data : i);
    setMenuItems(prev => prev.map(i => i.id === tempId ? data : i));
    cachedMenuItems = updated;
    saveToStorage(updated);
    return data;
  };

  const updateMenuItem = async (id: string, updates: Partial<MenuItem>) => {
    const previousItems = [...menuItems];
    setMenuItems(prev => prev.map(item => 
      item.id === id ? { ...item, ...updates } : item
    ));

    const { error } = await supabase
      .from('menu_items')
      .update(updates)
      .eq('id', id);

    if (error) {
      console.error('Error updating menu item:', error);
      toast.error('حدث خطأ في تحديث الصنف');
      setMenuItems(previousItems);
      return false;
    }

    toast.success('تم تحديث الصنف');
    const updated = menuItems.map(item => item.id === id ? { ...item, ...updates } : item);
    cachedMenuItems = updated;
    saveToStorage(updated);
    return true;
  };

  const deleteMenuItem = async (id: string) => {
    const previousItems = [...menuItems];
    setMenuItems(prev => prev.filter(item => item.id !== id));

    const { error } = await supabase
      .from('menu_items')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting menu item:', error);
      toast.error('حدث خطأ في حذف الصنف');
      setMenuItems(previousItems);
      return false;
    }

    toast.success('تم حذف الصنف');
    const updated = menuItems.filter(item => item.id !== id);
    cachedMenuItems = updated;
    saveToStorage(updated);
    return true;
  };

  const toggleAvailability = async (id: string, isAvailable: boolean) => {
    return updateMenuItem(id, { is_available: isAvailable });
  };

  const getAvailableItems = () => menuItems.filter(item => item.is_available);

  const getItemsByCategory = (category: string) => 
    menuItems.filter(item => item.category === category && item.is_available);

  const updateDisplayOrder = async (items: MenuItem[]) => {
    const updatedItems = menuItems.map(item => {
      const updated = items.find(i => i.id === item.id);
      return updated ? { ...item, display_order: updated.display_order } : item;
    });
    setMenuItems(updatedItems);
    cachedMenuItems = updatedItems;
    saveToStorage(updatedItems);

    const updates = items.map(item => 
      supabase
        .from('menu_items')
        .update({ display_order: item.display_order })
        .eq('id', item.id)
    );
    
    await Promise.all(updates);
  };

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
    updateDisplayOrder,
    refetch: fetchMenuItems,
  };
}
