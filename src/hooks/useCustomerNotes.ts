import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CustomerNote {
  id: string;
  customer_id: string | null;
  customer_phone: string;
  note: string;
  created_by: string;
  created_by_name: string;
  created_at: string;
  updated_at: string;
}

export function useCustomerNotes(customerPhone?: string) {
  const [notes, setNotes] = useState<CustomerNote[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchNotes = async () => {
    if (!customerPhone) {
      setNotes([]);
      return;
    }
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('customer_notes')
        .select('*')
        .eq('customer_phone', customerPhone)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setNotes(data || []);
    } catch (err) {
      console.error('Error fetching customer notes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();

    if (!customerPhone) return;

    const channel = supabase
      .channel(`customer-notes-${customerPhone}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'customer_notes', filter: `customer_phone=eq.${customerPhone}` },
        () => fetchNotes()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerPhone]);

  const addNote = async (note: string, createdByName: string, customerId?: string) => {
    try {
      if (!customerPhone) return { success: false, error: 'No phone' };
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return { success: false, error: 'Not authenticated' };
      const { error } = await supabase
        .from('customer_notes')
        .insert({
          customer_phone: customerPhone,
          customer_id: customerId || null,
          note,
          created_by: userData.user.id,
          created_by_name: createdByName,
        });
      if (error) throw error;
      await fetchNotes();
      return { success: true };
    } catch (err: any) {
      console.error('Error adding customer note:', err);
      return { success: false, error: err.message };
    }
  };

  const deleteNote = async (id: string) => {
    try {
      const { error } = await supabase.from('customer_notes').delete().eq('id', id);
      if (error) throw error;
      await fetchNotes();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  return { notes, loading, addNote, deleteNote, refetch: fetchNotes };
}