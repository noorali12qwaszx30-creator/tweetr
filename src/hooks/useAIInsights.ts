import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface AIInsight {
  id: string;
  snapshot_id: string;
  analysis_type: string;
  summary: string;
  insights: Array<{
    title: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
    category: string;
  }>;
  recommendations: Array<{
    title: string;
    action: string;
    impact: string;
    urgency: 'immediate' | 'soon' | 'later';
  }>;
  warnings: Array<{
    title: string;
    severity: 'critical' | 'warning' | 'info';
    description: string;
  }>;
  opportunities: Array<{
    title: string;
    description: string;
    potential: 'high' | 'medium';
  }>;
  overall_score: number;
  performance_grade: string;
  created_at: string;
}

export interface AISnapshot {
  id: string;
  snapshot_date: string;
  total_orders: number;
  completed_orders: number;
  cancelled_orders: number;
  total_revenue: number;
  created_at: string;
}

export function useAIInsights() {
  const { session } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [currentInsight, setCurrentInsight] = useState<AIInsight | null>(null);
  const [insightHistory, setInsightHistory] = useState<AIInsight[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Request new AI analysis
  const requestAnalysis = useCallback(async (analysisType: string = 'comprehensive') => {
    if (!session?.access_token) {
      toast.error('يجب تسجيل الدخول أولاً');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-insights`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ analysisType }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 429) {
          throw new Error('تم تجاوز حد الطلبات، يرجى المحاولة لاحقاً');
        }
        if (response.status === 402) {
          throw new Error('يرجى إضافة رصيد لحساب Lovable AI');
        }
        throw new Error(errorData.error || 'فشل في التحليل');
      }

      const result = await response.json();
      
      if (result.insight) {
        setCurrentInsight(result.insight);
        toast.success('تم التحليل بنجاح!');
        return result;
      }

      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'حدث خطأ غير متوقع';
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  // Fetch insight history
  const fetchHistory = useCallback(async (limit: number = 10) => {
    try {
      // Use raw query since types might not be updated yet
      const { data, error: fetchError } = await supabase
        .from('ai_insights' as any)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (fetchError) throw fetchError;

      // Type assertion since we know the structure matches
      setInsightHistory(data as unknown as AIInsight[]);
      return data;
    } catch (err) {
      console.error('Error fetching insight history:', err);
      return [];
    }
  }, []);

  // Fetch a specific insight by ID
  const fetchInsightById = useCallback(async (insightId: string) => {
    try {
      const { data, error: fetchError } = await supabase
        .from('ai_insights' as any)
        .select('*')
        .eq('id', insightId)
        .single();

      if (fetchError) throw fetchError;

      setCurrentInsight(data as unknown as AIInsight);
      return data;
    } catch (err) {
      console.error('Error fetching insight:', err);
      return null;
    }
  }, []);

  // Fetch latest insight
  const fetchLatestInsight = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('ai_insights' as any)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

      if (data) {
        setCurrentInsight(data as unknown as AIInsight);
      }
      return data;
    } catch (err) {
      console.error('Error fetching latest insight:', err);
      return null;
    }
  }, []);

  return {
    isLoading,
    error,
    currentInsight,
    insightHistory,
    requestAnalysis,
    fetchHistory,
    fetchInsightById,
    fetchLatestInsight,
    setCurrentInsight,
  };
}
