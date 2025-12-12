import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface DeliveryDriver {
  id: string;
  user_id: string;
  full_name: string;
  username: string;
  phone: string | null;
  is_active: boolean;
}

export function useDeliveryDrivers() {
  const [drivers, setDrivers] = useState<DeliveryDriver[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDrivers();
  }, []);

  const fetchDrivers = async () => {
    try {
      // Get all users with delivery role
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'delivery');

      if (roleError) {
        console.error('Error fetching delivery roles:', roleError);
        setLoading(false);
        return;
      }

      if (!roleData || roleData.length === 0) {
        setDrivers([]);
        setLoading(false);
        return;
      }

      const userIds = roleData.map(r => r.user_id);

      // Get profiles for these users
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, user_id, full_name, username, phone, is_active')
        .in('user_id', userIds)
        .eq('is_active', true);

      if (profilesError) {
        console.error('Error fetching driver profiles:', profilesError);
        setLoading(false);
        return;
      }

      const formattedDrivers: DeliveryDriver[] = (profiles || []).map(p => ({
        id: p.id,
        user_id: p.user_id,
        full_name: p.full_name || p.username,
        username: p.username,
        phone: p.phone,
        is_active: p.is_active,
      }));

      setDrivers(formattedDrivers);
    } catch (error) {
      console.error('Error in fetchDrivers:', error);
    } finally {
      setLoading(false);
    }
  };

  return { drivers, loading, refetch: fetchDrivers };
}
