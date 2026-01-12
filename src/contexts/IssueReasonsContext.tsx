import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface IssueReason {
  id: string;
  label: string;
  display_order: number;
  is_active: boolean;
}

interface IssueReasonsContextType {
  reasons: IssueReason[];
  loading: boolean;
  addReason: (label: string) => Promise<void>;
  updateReason: (id: string, label: string) => Promise<void>;
  removeReason: (id: string) => Promise<void>;
  refetch: () => Promise<void>;
}

const IssueReasonsContext = createContext<IssueReasonsContextType | undefined>(undefined);

export function IssueReasonsProvider({ children }: { children: ReactNode }) {
  const [reasons, setReasons] = useState<IssueReason[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReasons = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('issue_reasons')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) {
        console.error('Error fetching issue reasons:', error);
        return;
      }

      setReasons(data as IssueReason[]);
    } catch (err) {
      console.error('Error fetching issue reasons:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReasons();
  }, [fetchReasons]);

  const addReason = async (label: string) => {
    try {
      const maxOrder = reasons.length > 0 
        ? Math.max(...reasons.map(r => r.display_order)) + 1 
        : 1;

      const { data, error } = await supabase
        .from('issue_reasons')
        .insert({ label, display_order: maxOrder })
        .select()
        .single();

      if (error) {
        console.error('Error adding issue reason:', error);
        toast.error('حدث خطأ في إضافة سبب التبليغ');
        return;
      }

      setReasons(prev => [...prev, data as IssueReason]);
      toast.success('تم إضافة سبب التبليغ');
    } catch (err) {
      console.error('Error adding issue reason:', err);
      toast.error('حدث خطأ في إضافة سبب التبليغ');
    }
  };

  const updateReason = async (id: string, label: string) => {
    try {
      const { error } = await supabase
        .from('issue_reasons')
        .update({ label })
        .eq('id', id);

      if (error) {
        console.error('Error updating issue reason:', error);
        toast.error('حدث خطأ في تحديث سبب التبليغ');
        return;
      }

      setReasons(prev => prev.map(r => r.id === id ? { ...r, label } : r));
      toast.success('تم تحديث سبب التبليغ');
    } catch (err) {
      console.error('Error updating issue reason:', err);
      toast.error('حدث خطأ في تحديث سبب التبليغ');
    }
  };

  const removeReason = async (id: string) => {
    try {
      const { error } = await supabase
        .from('issue_reasons')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error removing issue reason:', error);
        toast.error('حدث خطأ في حذف سبب التبليغ');
        return;
      }

      setReasons(prev => prev.filter(r => r.id !== id));
      toast.success('تم حذف سبب التبليغ');
    } catch (err) {
      console.error('Error removing issue reason:', err);
      toast.error('حدث خطأ في حذف سبب التبليغ');
    }
  };

  return (
    <IssueReasonsContext.Provider value={{ reasons, loading, addReason, updateReason, removeReason, refetch: fetchReasons }}>
      {children}
    </IssueReasonsContext.Provider>
  );
}

export function useIssueReasons() {
  const context = useContext(IssueReasonsContext);
  if (context === undefined) {
    throw new Error('useIssueReasons must be used within an IssueReasonsProvider');
  }
  return context;
}
