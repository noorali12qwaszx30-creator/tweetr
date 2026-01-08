import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type InsightType = 
  | 'daily_report' 
  | 'predict_issues' 
  | 'analyze_cancellations' 
  | 'smart_alerts' 
  | 'health_score'
  | 'shift_summary'
  | 'order_timeline'
  | 'chat';

interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  type?: InsightType;
}

export interface HealthScoreData {
  score: number;
  factors: {
    kitchenSpeed: number;
    deliveryEfficiency: number;
    cancellationRate: number;
    orderFlow: number;
  };
  explanation: string;
}

export interface SmartAlertData {
  id: string;
  level: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  cause?: string;
  suggestion?: string;
  timestamp: Date;
}

export interface ShiftSummaryData {
  shiftName: string;
  strengths: string[];
  problems: string[];
  recommendation: string;
  stats: {
    totalOrders: number;
    completedOrders: number;
    cancelledOrders: number;
    avgDeliveryTime: number;
  };
}

export const useAIInsights = () => {
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [healthScore, setHealthScore] = useState<HealthScoreData | null>(null);
  const [alerts, setAlerts] = useState<SmartAlertData[]>([]);
  const [shiftSummary, setShiftSummary] = useState<ShiftSummaryData | null>(null);
  const { toast } = useToast();

  const parseJSONResponse = (response: string) => {
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return null;
    } catch {
      return null;
    }
  };

  const sendMessage = async (
    message: string,
    type: InsightType,
    ordersData: any[],
    additionalContext?: any
  ) => {
    setIsLoading(true);

    // Add user message to chat for chat type
    if (type === 'chat' && message) {
      setMessages(prev => [...prev, {
        role: 'user',
        content: message,
        timestamp: new Date(),
        type
      }]);
    }

    try {
      const { data, error } = await supabase.functions.invoke('ai-insights', {
        body: { type, message, ordersData, additionalContext }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      const responseContent = data.response;

      // Process based on type
      switch (type) {
        case 'health_score':
          const healthData = parseJSONResponse(responseContent);
          if (healthData) {
            setHealthScore(healthData);
          }
          break;

        case 'smart_alerts':
          const alertsData = parseJSONResponse(responseContent);
          if (Array.isArray(alertsData)) {
            setAlerts(alertsData.map((a: any, i: number) => ({
              ...a,
              id: `alert-${i}-${Date.now()}`,
              timestamp: new Date()
            })));
          }
          break;

        case 'shift_summary':
          const summaryData = parseJSONResponse(responseContent);
          if (summaryData) {
            setShiftSummary(summaryData);
          }
          break;

        default:
          // Add to messages for display
          const aiMessage: AIMessage = {
            role: 'assistant',
            content: responseContent,
            timestamp: new Date(),
            type
          };
          setMessages(prev => [...prev, aiMessage]);
          break;
      }

      return responseContent;

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
    return sendMessage('', 'analyze_cancellations', ordersData);
  };

  const getSmartAlerts = async (ordersData: any[]) => {
    return sendMessage('', 'smart_alerts', ordersData);
  };

  const getHealthScore = async (ordersData: any[]) => {
    return sendMessage('', 'health_score', ordersData);
  };

  const getShiftSummary = async (ordersData: any[]) => {
    return sendMessage('', 'shift_summary', ordersData);
  };

  const analyzeOrderTimeline = async (ordersData: any[], order: any) => {
    return sendMessage('', 'order_timeline', ordersData, { order });
  };

  const chat = async (message: string, ordersData: any[]) => {
    return sendMessage(message, 'chat', ordersData);
  };

  const clearMessages = () => {
    setMessages([]);
  };

  const refreshAll = async (ordersData: any[]) => {
    await Promise.all([
      getHealthScore(ordersData),
      getSmartAlerts(ordersData)
    ]);
  };

  return {
    messages,
    isLoading,
    healthScore,
    alerts,
    shiftSummary,
    getDailyReport,
    predictIssues,
    analyzeCancellations,
    getSmartAlerts,
    getHealthScore,
    getShiftSummary,
    analyzeOrderTimeline,
    chat,
    clearMessages,
    refreshAll
  };
};
