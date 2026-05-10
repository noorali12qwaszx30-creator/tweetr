import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface DriverLocation {
  id: string;
  user_id: string;
  user_name: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  speed: number | null;
  heading: number | null;
  battery_level: number | null;
  is_charging: boolean | null;
  is_gps_enabled: boolean;
  updated_at: string;
}

export function useDriverLocations() {
  const [locations, setLocations] = useState<DriverLocation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const { data } = await supabase
        .from('driver_locations')
        .select('*')
        .order('updated_at', { ascending: false });
      if (!cancelled && data) setLocations(data as any);
      if (!cancelled) setLoading(false);
    };
    load();

    const channel = supabase
      .channel('driver_locations_live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'driver_locations' }, (payload) => {
        setLocations((prev) => {
          if (payload.eventType === 'DELETE') {
            return prev.filter((p) => p.id !== (payload.old as any).id);
          }
          const row = payload.new as DriverLocation;
          const idx = prev.findIndex((p) => p.user_id === row.user_id);
          if (idx === -1) return [row, ...prev];
          const copy = [...prev];
          copy[idx] = row;
          return copy;
        });
      })
      .subscribe();

    // Refresh every 20s as polling fallback
    const interval = window.setInterval(load, 20000);

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
      window.clearInterval(interval);
    };
  }, []);

  return { locations, loading };
}

export function getStaleness(updatedAt: string): 'live' | 'recent' | 'stale' {
  const ageMs = Date.now() - new Date(updatedAt).getTime();
  if (ageMs < 30_000) return 'live';
  if (ageMs < 5 * 60_000) return 'recent';
  return 'stale';
}
