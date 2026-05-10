import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface TopSellingItem {
  menu_item_id: string | null;
  menu_item_name: string;
  total_quantity: number;
}

export function useTopSellingItems(limit: number = 20) {
  const [items, setItems] = useState<TopSellingItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTop = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('get_top_selling_items_today', { _limit: limit });
    if (!error && data) {
      setItems(
        (data as any[]).map(d => ({
          menu_item_id: d.menu_item_id,
          menu_item_name: d.menu_item_name,
          total_quantity: Number(d.total_quantity) || 0,
        }))
      );
    }
    setLoading(false);
  }, [limit]);

  useEffect(() => {
    fetchTop();
    // Refresh every 5 minutes — top sellers don't change second-by-second
    const interval = setInterval(fetchTop, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchTop]);

  return { items, loading, refetch: fetchTop };
}