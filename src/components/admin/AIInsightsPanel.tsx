import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { 
  Bot, 
  FileText, 
  AlertTriangle, 
  TrendingUp, 
  XCircle,
  Loader2,
  RefreshCw,
  Activity,
  Clock,
  BarChart3,
  Brain
} from 'lucide-react';
import { useAIInsights } from '@/hooks/useAIInsights';
import { OrderWithItems } from '@/hooks/useSupabaseOrders';

// Import sub-components
import HealthScoreCard from './ai/HealthScoreCard';
import SmartAlertCard, { SmartAlert } from './ai/SmartAlertCard';
import ShiftSummaryCard from './ai/ShiftSummaryCard';
import ExecutiveChat from './ai/ExecutiveChat';
import QuickStatsGrid from './ai/QuickStatsGrid';

interface AIInsightsPanelProps {
  orders: OrderWithItems[];
}

const AIInsightsPanel: React.FC<AIInsightsPanelProps> = ({ orders }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  
  const {
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
    chat,
    clearMessages,
    refreshAll
  } = useAIInsights();

  // Prepare orders data for AI
  const prepareOrdersData = () => {
    return orders.map(order => ({
      id: order.id,
      order_number: order.order_number,
      status: order.status,
      type: order.type,
      total_price: order.total_price,
      delivery_fee: order.delivery_fee,
      created_at: order.created_at,
      delivered_at: order.delivered_at,
      cancelled_at: order.cancelled_at,
      cancellation_reason: order.cancellation_reason,
      customer_name: order.customer_name,
      customer_address: order.customer_address,
      delivery_person_name: order.delivery_person_name,
      items: order.items?.map((item: any) => ({
        name: item.menu_item_name,
        quantity: item.quantity,
        price: item.menu_item_price
      }))
    }));
  };

  // Calculate quick stats
  const stats = {
    totalOrders: orders.length,
    completedOrders: orders.filter(o => o.status === 'delivered').length,
    cancelledOrders: orders.filter(o => o.status === 'cancelled').length,
    activeOrders: orders.filter(o => ['pending', 'preparing', 'ready', 'delivering'].includes(o.status)).length,
    preparingOrders: orders.filter(o => o.status === 'preparing').length,
    deliveringOrders: orders.filter(o => o.status === 'delivering').length,
    avgDeliveryTime: 0,
    completionRate: orders.length > 0 
      ? Math.round((orders.filter(o => o.status === 'delivered').length / orders.length) * 100)
      : 0
  };

  // Auto-refresh on mount
  useEffect(() => {
    if (orders.length > 0 && !lastRefresh) {
      handleRefresh();
    }
  }, [orders.length]);

  const handleRefresh = async () => {
    const ordersData = prepareOrdersData();
    await refreshAll(ordersData);
    setLastRefresh(new Date());
  };

  const handleQuickAction = async (action: string) => {
    const ordersData = prepareOrdersData();
    
    switch (action) {
      case 'daily_report':
        await getDailyReport(ordersData);
        setActiveTab('reports');
        break;
      case 'predict_issues':
        await predictIssues(ordersData);
        setActiveTab('reports');
        break;
      case 'analyze_cancellations':
        await analyzeCancellations(ordersData);
        setActiveTab('reports');
        break;
      case 'shift_summary':
        await getShiftSummary(ordersData);
        break;
    }
  };

  const handleChatMessage = async (message: string) => {
    await chat(message, prepareOrdersData());
  };

  // Default health score if not loaded
  const displayHealthScore = healthScore || {
    score: stats.completionRate,
    factors: {
      kitchenSpeed: 70,
      deliveryEfficiency: 75,
      cancellationRate: Math.round((stats.cancelledOrders / Math.max(stats.totalOrders, 1)) * 100),
      orderFlow: stats.activeOrders > 10 ? 50 : 80
    },
    explanation: 'جاري تحليل البيانات...'
  };

  // Default alerts if not loaded
  const displayAlerts: SmartAlert[] = alerts.length > 0 ? alerts : [
    {
      id: 'default-1',
      level: stats.activeOrders > 10 ? 'warning' : 'info',
      title: stats.activeOrders > 10 ? 'ضغط متوسط' : 'العمليات مستقرة',
      description: stats.activeOrders > 10 
        ? `يوجد ${stats.activeOrders} طلبات نشطة حالياً`
        : 'سير العمل طبيعي',
      timestamp: new Date()
    }
  ];

  const formatMessage = (content: string) => {
    return content.split('\n').map((line, i) => {
      const isHeader = line.startsWith('##') || line.startsWith('**');
      const isBullet = line.startsWith('-') || line.startsWith('•') || /^\d+\./.test(line);
      
      return (
        <p 
          key={i} 
          className={`
            ${isHeader ? 'font-bold text-sm mt-3 mb-1' : ''}
            ${isBullet ? 'pr-2 text-muted-foreground' : ''}
            ${!isHeader && !isBullet && line.trim() ? 'mt-1' : ''}
          `}
        >
          {line.replace(/^##\s*/, '').replace(/\*\*/g, '')}
        </p>
      );
    });
  };

  return (
    <div className="space-y-4" dir="rtl">
      {/* Header with refresh */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-6 h-6 text-primary" />
          <h2 className="text-lg font-bold">المساعد الذكي للمدير التنفيذي</h2>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isLoading}
          className="gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          تحديث
        </Button>
      </div>

      {/* Quick Stats */}
      <QuickStatsGrid stats={stats} />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column - Health Score & Alerts */}
        <div className="space-y-4">
          <HealthScoreCard 
            score={displayHealthScore.score} 
            factors={displayHealthScore.factors} 
          />
          
          <Card className="border-2">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
                التنبيهات الذكية
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {displayAlerts.slice(0, 3).map(alert => (
                <SmartAlertCard key={alert.id} alert={alert} />
              ))}
              {displayAlerts.length === 0 && !isLoading && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  لا توجد تنبيهات حالياً ✨
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Center Column - Chat & Commands */}
        <div className="lg:col-span-1">
          <ExecutiveChat
            messages={messages.filter(m => m.type === 'chat')}
            isLoading={isLoading}
            onSendMessage={handleChatMessage}
            onClearMessages={clearMessages}
          />
        </div>

        {/* Right Column - Quick Actions & Reports */}
        <div className="space-y-4">
          {/* Quick Actions */}
          <Card className="border-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">إجراءات سريعة</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                className="flex flex-col items-center gap-1 h-auto py-3 text-xs"
                onClick={() => handleQuickAction('daily_report')}
                disabled={isLoading}
              >
                <FileText className="w-5 h-5 text-blue-500" />
                تقرير يومي
              </Button>
              
              <Button
                variant="outline"
                className="flex flex-col items-center gap-1 h-auto py-3 text-xs"
                onClick={() => handleQuickAction('predict_issues')}
                disabled={isLoading}
              >
                <TrendingUp className="w-5 h-5 text-purple-500" />
                توقع المشاكل
              </Button>
              
              <Button
                variant="outline"
                className="flex flex-col items-center gap-1 h-auto py-3 text-xs"
                onClick={() => handleQuickAction('analyze_cancellations')}
                disabled={isLoading}
              >
                <XCircle className="w-5 h-5 text-red-500" />
                تحليل الإلغاءات
              </Button>
              
              <Button
                variant="outline"
                className="flex flex-col items-center gap-1 h-auto py-3 text-xs"
                onClick={() => handleQuickAction('shift_summary')}
                disabled={isLoading}
              >
                <Clock className="w-5 h-5 text-green-500" />
                ملخص الشفت
              </Button>
            </CardContent>
          </Card>

          {/* Reports Display */}
          <Card className="border-2">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="w-5 h-5 text-primary" />
                التقارير
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[280px]">
                {messages.filter(m => m.type !== 'chat').length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-8">
                    <FileText className="w-10 h-10 mb-3 opacity-50" />
                    <p className="text-sm text-center">
                      اضغط على أحد الإجراءات السريعة
                      <br />
                      لإنشاء تقرير
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.filter(m => m.type !== 'chat').map((msg, i) => (
                      <div key={i} className="bg-muted/30 rounded-lg p-3 border">
                        <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
                          <Bot className="w-3 h-3" />
                          <span>
                            {msg.type === 'daily_report' && 'تقرير يومي'}
                            {msg.type === 'predict_issues' && 'توقعات'}
                            {msg.type === 'analyze_cancellations' && 'تحليل الإلغاءات'}
                            {msg.type === 'smart_alerts' && 'تنبيهات'}
                          </span>
                          <span className="mr-auto">
                            {msg.timestamp.toLocaleTimeString('ar-SA', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </span>
                        </div>
                        <div className="text-xs leading-relaxed">
                          {formatMessage(msg.content)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {isLoading && (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Shift Summary (if available) */}
      {shiftSummary && (
        <ShiftSummaryCard
          shiftName={shiftSummary.shiftName}
          strengths={shiftSummary.strengths}
          problems={shiftSummary.problems}
          recommendation={shiftSummary.recommendation}
          stats={shiftSummary.stats}
        />
      )}
    </div>
  );
};

export default AIInsightsPanel;
