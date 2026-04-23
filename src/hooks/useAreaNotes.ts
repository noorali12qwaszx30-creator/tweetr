import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AreaNote {
  id: string;
  delivery_area_id: string;
  delivery_area_name: string;
  note: string;
  severity: 'info' | 'warning' | 'critical' | string;
  created_by: string;
  created_by_name: string;
  created_at: string;
  updated_at: string;
}

export function useAreaNotes(areaId?: string) {
  const [notes, setNotes] = useState<AreaNote[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchNotes = async () => {
    try {
      setLoading(true);
      let query = supabase.from('area_notes').select('*').order('created_at', { ascending: false });
      if (areaId) query = query.eq('delivery_area_id', areaId);
      const { data, error } = await query;
      if (error) throw error;
      setNotes((data as AreaNote[]) || []);
    } catch (err) {
      console.error('Error fetching area notes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
    const channel = supabase
      .channel(`area-notes-${areaId || 'all'}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'area_notes' },
        () => fetchNotes()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [areaId]);

  const addNote = async (areaId: string, areaName: string, note: string, severity: string, createdByName: string) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return { success: false, error: 'Not authenticated' };
      const { error } = await supabase.from('area_notes').insert({
        delivery_area_id: areaId,
        delivery_area_name: areaName,
        note,
        severity,
        created_by: userData.user.id,
        created_by_name: createdByName,
      });
      if (error) throw error;
      await fetchNotes();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const deleteNote = async (id: string) => {
    try {
      const { error } = await supabase.from('area_notes').delete().eq('id', id);
      if (error) throw error;
      await fetchNotes();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  return { notes, loading, addNote, deleteNote, refetch: fetchNotes };
}