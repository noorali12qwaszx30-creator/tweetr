// Fetches archived (post daily-reset) orders for the current delivery driver
// so weekly/monthly/all-time stats remain visible after a manual or automatic reset.
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { OrderWithItems, DbOrderItem } from './useSupabaseOrders';

export function useDriverArchivedOrders(driverId: string | undefined) {
  const [archivedOrders, setArchivedOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchArchived = useCallback(async () => {
    if (!driverId) {
      setArchivedOrders([]);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from('orders_history')
      .select('*, order_items (*)')
      .eq('delivery_person_id', driverId)
      .order('delivered_at', { ascending: false })
      .limit(2000);

    if (error) {
      console.error('Error fetching archived driver orders:', error);
      setLoading(false);
      return;
    }

    const mapped: OrderWithItems[] = (data || []).map((o: any) => ({
      ...o,
      items: (o.order_items || []) as DbOrderItem[],
    })) as OrderWithItems[];
    setArchivedOrders(mapped);
    setLoading(false);
  }, [driverId]);

  useEffect(() => {
    fetchArchived();
    const interval = setInterval(fetchArchived, 60000);
    return () => clearInterval(interval);
  }, [fetchArchived]);

  return { archivedOrders, loading, refetch: fetchArchived };
}