import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type DriverStatusValue = 'available' | 'busy' | 'break' | 'offline';

export interface DriverStatus {
  id: string;
  user_id: string;
  status: DriverStatusValue;
  status_message: string | null;
  updated_at: string;
  created_at: string;
}

export const STATUS_LABELS: Record<DriverStatusValue, string> = {
  available: 'متاح',
  busy: 'مشغول',
  break: 'استراحة',
  offline: 'خارج الخدمة',
};

export const STATUS_COLORS: Record<DriverStatusValue, string> = {
  available: 'bg-success text-success-foreground',
  busy: 'bg-warning text-warning-foreground',
  break: 'bg-info text-info-foreground',
  offline: 'bg-muted text-muted-foreground',
};

export function useDriverStatus(userId?: string) {
  const [status, setStatus] = useState<DriverStatus | null>(null);
  const [allStatuses, setAllStatuses] = useState<DriverStatus[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStatus = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('driver_status')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      if (error) throw error;
      setStatus(data as DriverStatus | null);
    } catch (err) {
      console.error('Error fetching driver status:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllStatuses = async () => {
    try {
      const { data, error } = await supabase.from('driver_status').select('*');
      if (error) throw error;
      setAllStatuses((data as DriverStatus[]) || []);
    } catch (err) {
      console.error('Error fetching all driver statuses:', err);
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchAllStatuses();

    const channel = supabase
      .channel('driver-status-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'driver_status' },
        () => {
          fetchStatus();
          fetchAllStatuses();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const updateStatus = async (newStatus: DriverStatusValue, message?: string) => {
    if (!userId) return { success: false };
    try {
      const { error } = await supabase
        .from('driver_status')
        .upsert(
          { user_id: userId, status: newStatus, status_message: message || null },
          { onConflict: 'user_id' }
        );
      if (error) throw error;
      await fetchStatus();
      return { success: true };
    } catch (err: any) {
      console.error('Error updating driver status:', err);
      return { success: false, error: err.message };
    }
  };

  return { status, allStatuses, loading, updateStatus, refetch: fetchStatus };
}