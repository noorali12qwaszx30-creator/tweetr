import { useState, useEffect, useCallback, useRef } from 'react';
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

// Simple cache for menu items to avoid loading delay on navigation
let cachedMenuItems: MenuItem[] | null = null;
let cachedCategories: string[] | null = null;

export function useMenuItems() {
  // Initialize with cached data immediately - no loading state if cache exists
  const hasCache = cachedMenuItems && cachedMenuItems.length > 0;
  const [menuItems, setMenuItems] = useState<MenuItem[]>(cachedMenuItems || []);
  const [loading, setLoading] = useState(!hasCache); // Only show loading if no cache
  const [categories, setCategories] = useState<string[]>(cachedCategories || []);
  const isMounted = useRef(true);

  const fetchMenuItems = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .order('category')
        .order('display_order');

      if (error) {
        console.error('[useMenuItems] Error:', error);
        if (isMounted.current) setLoading(false);
        return;
      }

      const items = (data || []) as MenuItem[];
      const uniqueCategories = [...new Set(items.map(item => item.category))];
      
      // Update cache
      cachedMenuItems = items;
      cachedCategories = uniqueCategories;
      
      if (isMounted.current) {
        setMenuItems(items);
        setCategories(uniqueCategories);
        setLoading(false);
      }
    } catch (err) {
      console.error('[useMenuItems] Unexpected error:', err);
      if (isMounted.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;
    
    // Fetch fresh data in background (no loading spinner if cache exists)
    fetchMenuItems(false);
    
    // Subscribe to realtime changes
    const channel = supabase
      .channel('menu-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'menu_items' },
        () => fetchMenuItems(false)
      )
      .subscribe();

    // Refresh every 60 seconds (less aggressive)
    const refreshInterval = setInterval(() => fetchMenuItems(false), 60000);

    return () => {
      isMounted.current = false;
      supabase.removeChannel(channel);
      clearInterval(refreshInterval);
    };
  }, [fetchMenuItems]);

  const addMenuItem = async (item: Omit<MenuItem, 'id' | 'is_available' | 'display_order'>) => {
    // Optimistic update
    const tempId = `temp-${Date.now()}`;
    const newItem: MenuItem = {
      id: tempId,
      ...item,
      is_available: true,
      display_order: menuItems.length,
    };
    setMenuItems(prev => [...prev, newItem]);

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
      // Revert optimistic update
      setMenuItems(prev => prev.filter(i => i.id !== tempId));
      return null;
    }

    toast.success('تم إضافة الصنف');
    // Replace temp item with real item
    setMenuItems(prev => prev.map(i => i.id === tempId ? data : i));
    cachedMenuItems = menuItems.map(i => i.id === tempId ? data : i);
    return data;
  };

  const updateMenuItem = async (id: string, updates: Partial<MenuItem>) => {
    // Optimistic update
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
      // Revert
      setMenuItems(previousItems);
      return false;
    }

    toast.success('تم تحديث الصنف');
    cachedMenuItems = menuItems.map(item => item.id === id ? { ...item, ...updates } : item);
    return true;
  };

  const deleteMenuItem = async (id: string) => {
    // Optimistic update
    const previousItems = [...menuItems];
    setMenuItems(prev => prev.filter(item => item.id !== id));

    const { error } = await supabase
      .from('menu_items')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting menu item:', error);
      toast.error('حدث خطأ في حذف الصنف');
      // Revert
      setMenuItems(previousItems);
      return false;
    }

    toast.success('تم حذف الصنف');
    cachedMenuItems = menuItems.filter(item => item.id !== id);
    return true;
  };

  const toggleAvailability = async (id: string, isAvailable: boolean) => {
    return updateMenuItem(id, { is_available: isAvailable });
  };

  const getAvailableItems = () => menuItems.filter(item => item.is_available);

  const getItemsByCategory = (category: string) => 
    menuItems.filter(item => item.category === category && item.is_available);

  const updateDisplayOrder = async (items: MenuItem[]) => {
    // Optimistic update
    const updatedItems = menuItems.map(item => {
      const updated = items.find(i => i.id === item.id);
      return updated ? { ...item, display_order: updated.display_order } : item;
    });
    setMenuItems(updatedItems);
    cachedMenuItems = updatedItems;

    // Update display_order for multiple items in parallel
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
