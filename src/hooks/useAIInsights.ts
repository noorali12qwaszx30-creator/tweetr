import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type InsightType = 'daily_report' | 'predict_issues' | 'analyze_cancellations' | 'smart_alerts' | 'chat';

interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  type?: InsightType;
}

export const useAIInsights = () => {
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const sendMessage = async (
    message: string,
    type: InsightType,
    ordersData: any[]
  ) => {
    setIsLoading(true);

    // Add user message to chat
    if (type === 'chat') {
      setMessages(prev => [...prev, {
        role: 'user',
        content: message,
        timestamp: new Date(),
        type
      }]);
    }

    try {
      const { data, error } = await supabase.functions.invoke('ai-insights', {
        body: { type, message, ordersData }
      });

      if (error) {
        throw error;
      }

      if (data.error) {
        throw new Error(data.error);
      }

      const aiMessage: AIMessage = {
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
        type
      };

      setMessages(prev => [...prev, aiMessage]);
      return data.response;

    } catch (error: any) {
      console.error('AI Insights error:', error);
      
      let errorMessage = 'حدث خطأ في الاتصال بالذكاء الاصطناعي';
      
      if (error.message?.includes('429')) {
        errorMessage = 'تم تجاوز حد الطلبات، حاول مرة أخرى بعد قليل';
      } else if (error.message?.includes('402')) {
        errorMessage = 'يرجى إضافة رصيد للاستمرار';
      }

      toast({
        title: 'خطأ',
        description: errorMessage,
        variant: 'destructive'
      });

      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const getDailyReport = async (ordersData: any[]) => {
    return sendMessage('', 'daily_report', ordersData);
  };

  const predictIssues = async (ordersData: any[]) => {
    return sendMessage('', 'predict_issues', ordersData);
  };

  const analyzeCancellations = async (ordersData: any[]) => {
    const cancelledOrders = ordersData.filter(o => o.status === 'cancelled');
    return sendMessage('', 'analyze_cancellations', cancelledOrders);
  };

  const getSmartAlerts = async (ordersData: any[]) => {
    return sendMessage('', 'smart_alerts', ordersData);
  };

  const chat = async (message: string, ordersData: any[]) => {
    return sendMessage(message, 'chat', ordersData);
  };

  const clearMessages = () => {
    setMessages([]);
  };

  return {
    messages,
    isLoading,
    getDailyReport,
    predictIssues,
    analyzeCancellations,
    getSmartAlerts,
    chat,
    clearMessages
  };
};
