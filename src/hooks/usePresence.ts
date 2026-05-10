import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface PresenceUser {
  user_id: string;
  user_name: string;
  user_role: string | null;
  status: 'online' | 'offline' | 'away';
  last_seen_at: string;
}

/** Maintains current user presence + subscribes to presence changes. */
export function usePresence() {
  const { user } = useAuth();
  const [users, setUsers] = useState<PresenceUser[]>([]);

  // Heartbeat
  useEffect(() => {
    if (!user?.id) return;
    const upsert = async (status: 'online' | 'offline' | 'away' = 'online') => {
      await supabase.from('user_presence').upsert({
        user_id: user.id,
        user_name: user.fullName || user.username,
        user_role: user.role,
        status,
        last_seen_at: new Date().toISOString(),
      });
    };
    upsert('online');
    const heartbeat = setInterval(() => upsert('online'), 60000);
    const onHide = () => upsert(document.hidden ? 'away' : 'online');
    document.addEventListener('visibilitychange', onHide);
    const onUnload = () => {
      navigator.sendBeacon?.(
        `https://mlframmmnctcvovqtrxm.supabase.co/rest/v1/user_presence?user_id=eq.${user.id}`,
      );
      upsert('offline');
    };
    window.addEventListener('beforeunload', onUnload);
    return () => {
      clearInterval(heartbeat);
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('beforeunload', onUnload);
      upsert('offline');
    };
  }, [user?.id, user?.username, user?.fullName, user?.role]);

  // Load + subscribe
  useEffect(() => {
    if (!user?.id) return;
    let active = true;
    const load = async () => {
      const { data } = await supabase
        .from('user_presence')
        .select('*')
        .order('user_name');
      if (active && data) setUsers(data as PresenceUser[]);
    };
    load();
    const ch = supabase
      .channel('presence-watch')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_presence' }, load)
      .subscribe();
    return () => {
      active = false;
      supabase.removeChannel(ch);
    };
  }, [user?.id]);

  return users;
}

/** Considers a user online if last_seen within 75s. */
export function isOnline(p: PresenceUser): boolean {
  if (p.status === 'offline') return false;
  const diff = Date.now() - new Date(p.last_seen_at).getTime();
  return diff < 75_000;
}