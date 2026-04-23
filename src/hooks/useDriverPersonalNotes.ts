import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PersonalNote {
  id: string;
  user_id: string;
  title: string | null;
  content: string;
  created_at: string;
  updated_at: string;
}

export function useDriverPersonalNotes(userId?: string) {
  const [notes, setNotes] = useState<PersonalNote[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotes = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('driver_personal_notes')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      setNotes((data as PersonalNote[]) || []);
    } catch (err) {
      console.error('Error fetching personal notes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const addNote = async (content: string, title?: string) => {
    if (!userId) return { success: false };
    try {
      const { error } = await supabase
        .from('driver_personal_notes')
        .insert({ user_id: userId, content, title: title || null });
      if (error) throw error;
      await fetchNotes();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const updateNote = async (id: string, content: string, title?: string) => {
    try {
      const { error } = await supabase
        .from('driver_personal_notes')
        .update({ content, title: title || null })
        .eq('id', id);
      if (error) throw error;
      await fetchNotes();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const deleteNote = async (id: string) => {
    try {
      const { error } = await supabase.from('driver_personal_notes').delete().eq('id', id);
      if (error) throw error;
      await fetchNotes();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  return { notes, loading, addNote, updateNote, deleteNote, refetch: fetchNotes };
}