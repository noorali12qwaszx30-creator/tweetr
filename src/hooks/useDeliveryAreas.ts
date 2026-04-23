import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface DeliveryArea {
  id: string;
  name: string;
  is_active: boolean;
  order_count: number;
  display_order: number;
  delivery_fee: number;
  created_at: string;
  updated_at: string;
}

export function useDeliveryAreas() {
  const [areas, setAreas] = useState<DeliveryArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAreas = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('delivery_areas')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      setAreas(data || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching delivery areas:', err);
      setError('حدث خطأ في جلب المناطق');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAreas();
  }, []);

  const addArea = async (name: string, deliveryFee: number = 0) => {
    try {
      const maxOrder = areas.length > 0 
        ? Math.max(...areas.map(a => a.display_order)) + 1 
        : 0;
      
      const { data, error } = await supabase
        .from('delivery_areas')
        .insert({ name, display_order: maxOrder, delivery_fee: deliveryFee })
        .select()
        .single();

      if (error) throw error;
      setAreas(prev => [...prev, data]);
      return { success: true, data };
    } catch (err: any) {
      console.error('Error adding delivery area:', err);
      return { success: false, error: err.message };
    }
  };

  const updateArea = async (id: string, updates: Partial<Pick<DeliveryArea, 'name' | 'is_active' | 'display_order' | 'delivery_fee'>>) => {
    try {
      const { error } = await supabase
        .from('delivery_areas')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      setAreas(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
      return { success: true };
    } catch (err: any) {
      console.error('Error updating delivery area:', err);
      return { success: false, error: err.message };
    }
  };

  const deleteArea = async (id: string) => {
    try {
      const { error } = await supabase
        .from('delivery_areas')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setAreas(prev => prev.filter(a => a.id !== id));
      return { success: true };
    } catch (err: any) {
      console.error('Error deleting delivery area:', err);
      return { success: false, error: err.message };
    }
  };

  const activeAreas = areas.filter(a => a.is_active);

  return {
    areas,
    activeAreas,
    loading,
    error,
    addArea,
    updateArea,
    deleteArea,
    setAreas,
    refetch: fetchAreas,
  };
}
