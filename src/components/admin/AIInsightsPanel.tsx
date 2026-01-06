import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { 
  Bot, 
  Send, 
  FileText, 
  AlertTriangle, 
  TrendingUp, 
  XCircle,
  Loader2,
  Sparkles,
  RefreshCw,
  Trash2
} from 'lucide-react';
import { useAIInsights } from '@/hooks/useAIInsights';
import { OrderWithItems } from '@/hooks/useSupabaseOrders';

interface AIInsightsPanelProps {
  orders: OrderWithItems[];
}

const AIInsightsPanel: React.FC<AIInsightsPanelProps> = ({ orders }) => {
  const [inputMessage, setInputMessage] = useState('');
  const [activeTab, setActiveTab] = useState('chat');
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const {
    messages,
    isLoading,
    getDailyReport,
    predictIssues,
    analyzeCancellations,
    getSmartAlerts,
    chat,
    clearMessages
  } = useAIInsights();

  // Prepare orders data for AI (using database field names)
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
      delivery_person_name: order.delivery_person_name,
      items: order.items?.map((item: any) => ({
        name: item.menu_item_name,
        quantity: item.quantity,
        price: item.menu_item_price
      }))
    }));
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;
    
    const message = inputMessage;
    setInputMessage('');
    await chat(message, prepareOrdersData());
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleQuickAction = async (action: string) => {
    const ordersData = prepareOrdersData();
    
    switch (action) {
      case 'daily_report':
        await getDailyReport(ordersData);
        break;
      case 'predict_issues':
        await predictIssues(ordersData);
        break;
      case 'analyze_cancellations':
        await analyzeCancellations(ordersData);
        break;
      case 'smart_alerts':
        await getSmartAlerts(ordersData);
        break;
    }
  };

  // Auto scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const formatMessage = (content: string) => {
    // Convert markdown-like formatting to HTML
    return content
      .split('\n')
      .map((line, i) => (
        <p key={i} className={line.startsWith('##') ? 'font-bold text-lg mt-3' : 'mt-1'}>
          {line.replace(/^##\s*/, '')}
        </p>
      ));
  };

  return (
    <div className="space-y-4">
      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Button
          variant="outline"
          className="flex flex-col items-center gap-2 h-auto py-4 hover:bg-primary/10"
          onClick={() => handleQuickAction('daily_report')}
          disabled={isLoading}
        >
          <FileText className="w-6 h-6 text-blue-500" />
          <span className="text-sm">تقرير يومي</span>
        </Button>
        
        <Button
          variant="outline"
          className="flex flex-col items-center gap-2 h-auto py-4 hover:bg-primary/10"
          onClick={() => handleQuickAction('smart_alerts')}
          disabled={isLoading}
        >
          <AlertTriangle className="w-6 h-6 text-yellow-500" />
          <span className="text-sm">تنبيهات ذكية</span>
        </Button>
        
        <Button
          variant="outline"
          className="flex flex-col items-center gap-2 h-auto py-4 hover:bg-primary/10"
          onClick={() => handleQuickAction('predict_issues')}
          disabled={isLoading}
        >
          <TrendingUp className="w-6 h-6 text-purple-500" />
          <span className="text-sm">توقع المشاكل</span>
        </Button>
        
        <Button
          variant="outline"
          className="flex flex-col items-center gap-2 h-auto py-4 hover:bg-primary/10"
          onClick={() => handleQuickAction('analyze_cancellations')}
          disabled={isLoading}
        >
          <XCircle className="w-6 h-6 text-red-500" />
          <span className="text-sm">تحليل الإلغاءات</span>
        </Button>
      </div>

      {/* Chat Interface */}
      <Card className="border-2">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Bot className="w-5 h-5 text-primary" />
              المساعد الذكي
            </CardTitle>
            {messages.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearMessages}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="w-4 h-4 ml-1" />
                مسح المحادثة
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Messages Area */}
          <ScrollArea 
            className="h-[400px] rounded-lg border bg-muted/30 p-4"
            ref={scrollRef}
          >
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <Sparkles className="w-12 h-12 mb-4 text-primary/50" />
                <p className="text-center">
                  مرحباً! أنا مساعدك الذكي 🤖
                  <br />
                  اسألني عن أي شيء يخص الطلبات والأداء
                </p>
                <div className="mt-4 text-sm space-y-1 text-center">
                  <p>💡 جرب: "ما هو أكثر صنف مبيعاً اليوم؟"</p>
                  <p>💡 أو: "لماذا تأخرت الطلبات؟"</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((msg, index) => (
                  <div
                    key={index}
                    className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                        msg.role === 'user'
                          ? 'bg-primary text-primary-foreground rounded-bl-sm'
                          : 'bg-card border shadow-sm rounded-br-sm'
                      }`}
                    >
                      {msg.role === 'assistant' && (
                        <div className="flex items-center gap-1 mb-2 text-xs text-muted-foreground">
                          <Bot className="w-3 h-3" />
                          <span>المساعد الذكي</span>
                        </div>
                      )}
                      <div className="text-sm leading-relaxed whitespace-pre-wrap">
                        {formatMessage(msg.content)}
                      </div>
                      <div className={`text-[10px] mt-2 ${
                        msg.role === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                      }`}>
                        {msg.timestamp.toLocaleTimeString('ar-SA', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </div>
                    </div>
                  </div>
                ))}
                
                {isLoading && (
                  <div className="flex justify-end">
                    <div className="bg-card border rounded-2xl rounded-br-sm px-4 py-3 shadow-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm">جاري التحليل...</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          {/* Input Area */}
          <div className="flex gap-2">
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="اسأل عن الطلبات، الأداء، أو أي شيء..."
              disabled={isLoading}
              className="flex-1"
              dir="rtl"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isLoading}
              size="icon"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>

          {/* Quick Questions */}
          <div className="flex flex-wrap gap-2">
            {[
              'ما أداء اليوم؟',
              'أكثر صنف مبيعاً؟',
              'سبب التأخيرات؟',
              'توقعات الغد؟'
            ].map((question, i) => (
              <Button
                key={i}
                variant="secondary"
                size="sm"
                onClick={() => {
                  setInputMessage(question);
                }}
                disabled={isLoading}
                className="text-xs"
              >
                {question}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
        <Card className="p-3">
          <div className="text-2xl font-bold text-primary">{orders.length}</div>
          <div className="text-xs text-muted-foreground">إجمالي الطلبات</div>
        </Card>
        <Card className="p-3">
          <div className="text-2xl font-bold text-green-500">
            {orders.filter(o => o.status === 'delivered').length}
          </div>
          <div className="text-xs text-muted-foreground">تم التوصيل</div>
        </Card>
        <Card className="p-3">
          <div className="text-2xl font-bold text-yellow-500">
            {orders.filter(o => ['pending', 'preparing', 'ready', 'delivering'].includes(o.status)).length}
          </div>
          <div className="text-xs text-muted-foreground">نشط الآن</div>
        </Card>
        <Card className="p-3">
          <div className="text-2xl font-bold text-red-500">
            {orders.filter(o => o.status === 'cancelled').length}
          </div>
          <div className="text-xs text-muted-foreground">ملغي</div>
        </Card>
      </div>
    </div>
  );
};

export default AIInsightsPanel;
