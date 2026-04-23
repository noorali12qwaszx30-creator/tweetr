import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SosAlert {
  id: string;
  user_id: string;
  user_name: string;
  alert_type: string;
  message: string | null;
  delivery_area_id: string | null;
  delivery_area_name: string | null;
  status: string;
  acknowledged_by: string | null;
  acknowledged_by_name: string | null;
  acknowledged_at: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useDriverSosAlerts() {
  const [alerts, setAlerts] = useState<SosAlert[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = async () => {
    try {
      const { data, error } = await supabase
        .from('driver_sos_alerts')
        .select('*')
        .neq('status', 'resolved')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setAlerts((data as SosAlert[]) || []);
    } catch (err) {
      console.error('SOS fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch();
    const channel = supabase
      .channel('driver-sos-alerts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'driver_sos_alerts' }, () => fetch())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const createSos = async (input: {
    user_id: string;
    user_name: string;
    alert_type: string;
    message?: string;
    delivery_area_id?: string;
    delivery_area_name?: string;
  }) => {
    try {
      const { error } = await supabase.from('driver_sos_alerts').insert(input);
      if (error) throw error;
      await fetch();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const acknowledgeSos = async (id: string, userId: string, userName: string) => {
    try {
      const { error } = await supabase
        .from('driver_sos_alerts')
        .update({
          status: 'acknowledged',
          acknowledged_by: userId,
          acknowledged_by_name: userName,
          acknowledged_at: new Date().toISOString(),
        })
        .eq('id', id);
      if (error) throw error;
      await fetch();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const resolveSos = async (id: string) => {
    try {
      const { error } = await supabase
        .from('driver_sos_alerts')
        .update({ status: 'resolved', resolved_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      await fetch();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  return { alerts, loading, createSos, acknowledgeSos, resolveSos };
}