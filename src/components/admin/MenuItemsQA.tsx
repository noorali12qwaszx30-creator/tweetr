import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, UtensilsCrossed, Send, TrendingUp, MapPin, Package, BarChart3 } from 'lucide-react';
import { formatNumber, toEnglishNumbers } from '@/lib/formatNumber';
import { toast } from 'sonner';

interface MenuItemStats {
  id: string;
  name: string;
  category: string;
  total_sold: number;
  total_revenue: number;
  delivery_count: number;
  takeaway_count: number;
  areas: { name: string; count: number }[];
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export function MenuItemsQA() {
  const { session } = useAuth();
  const [menuStats, setMenuStats] = useState<MenuItemStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [question, setQuestion] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isAsking, setIsAsking] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MenuItemStats | null>(null);

  // Fetch menu item statistics
  const fetchMenuStats = useCallback(async () => {
    try {
      // Fetch all menu items
      const { data: menuItems, error: menuError } = await supabase
        .from('menu_items')
        .select('id, name, category');
      
      if (menuError) throw menuError;

      // Fetch all order items with their orders
      const { data: orderItems, error: orderError } = await supabase
        .from('order_items')
        .select('menu_item_id, menu_item_name, menu_item_price, quantity, order_id');
      
      if (orderError) throw orderError;

      // Fetch orders with their details
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('id, type, status, delivery_area_id');
      
      if (ordersError) throw ordersError;

      // Fetch delivery areas
      const { data: areas, error: areasError } = await supabase
        .from('delivery_areas')
        .select('id, name');
      
      if (areasError) throw areasError;

      const areaMap = new Map(areas?.map(a => [a.id, a.name]) || []);
      const orderMap = new Map(orders?.map(o => [o.id, o]) || []);

      // Calculate stats for each menu item
      const stats: MenuItemStats[] = (menuItems || []).map(item => {
        const itemOrders = (orderItems || []).filter(oi => 
          oi.menu_item_id === item.id || oi.menu_item_name === item.name
        );

        let totalSold = 0;
        let totalRevenue = 0;
        let deliveryCount = 0;
        let takeawayCount = 0;
        const areaStats: Record<string, number> = {};

        itemOrders.forEach(oi => {
          const order = orderMap.get(oi.order_id);
          if (order && order.status !== 'cancelled') {
            totalSold += oi.quantity;
            totalRevenue += oi.quantity * Number(oi.menu_item_price);
            
            if (order.type === 'delivery') {
              deliveryCount += oi.quantity;
              if (order.delivery_area_id) {
                const areaName = areaMap.get(order.delivery_area_id) || 'غير محدد';
                areaStats[areaName] = (areaStats[areaName] || 0) + oi.quantity;
              }
            } else {
              takeawayCount += oi.quantity;
            }
          }
        });

        const areasArray = Object.entries(areaStats)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count);

        return {
          id: item.id,
          name: item.name,
          category: item.category,
          total_sold: totalSold,
          total_revenue: totalRevenue,
          delivery_count: deliveryCount,
          takeaway_count: takeawayCount,
          areas: areasArray
        };
      }).sort((a, b) => b.total_sold - a.total_sold);

      setMenuStats(stats);
    } catch (err) {
      console.error('Error fetching menu stats:', err);
      toast.error('حدث خطأ في جلب الإحصائيات');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMenuStats();
  }, [fetchMenuStats]);

  // Ask AI about menu items
  const askQuestion = async () => {
    if (!question.trim() || !session?.access_token) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: question,
      timestamp: new Date()
    };
    
    setChatHistory(prev => [...prev, userMessage]);
    setQuestion('');
    setIsAsking(true);

    try {
      // Prepare menu data for AI
      const menuDataSummary = menuStats.map(item => ({
        name: item.name,
        category: item.category,
        total_sold: item.total_sold,
        revenue: item.total_revenue,
        delivery: item.delivery_count,
        takeaway: item.takeaway_count,
        top_areas: item.areas.slice(0, 3).map(a => `${a.name}: ${a.count}`)
      }));

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/menu-qa`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            question: userMessage.content,
            menuData: menuDataSummary,
            chatHistory: chatHistory.slice(-6).map(m => ({ role: m.role, content: m.content }))
          }),
        }
      );

      if (!response.ok) {
        throw new Error('فشل في الإجابة على السؤال');
      }

      const result = await response.json();
      
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: result.answer || 'لم أتمكن من الإجابة على سؤالك',
        timestamp: new Date()
      };
      
      setChatHistory(prev => [...prev, assistantMessage]);
    } catch (err) {
      console.error('Error asking question:', err);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'عذراً، حدث خطأ أثناء معالجة سؤالك. يرجى المحاولة مرة أخرى.',
        timestamp: new Date()
      };
      setChatHistory(prev => [...prev, errorMessage]);
    } finally {
      setIsAsking(false);
    }
  };

  // Quick question buttons
  const quickQuestions = [
    { label: 'أكثر صنف مبيعاً', question: 'ما هو أكثر صنف مبيعاً؟' },
    { label: 'أقل صنف مبيعاً', question: 'ما هو أقل صنف مبيعاً؟' },
    { label: 'أفضل منطقة للتوصيل', question: 'ما هي أفضل منطقة من حيث الطلبات؟' },
    { label: 'مقارنة التوصيل والاستلام', question: 'قارن بين مبيعات التوصيل والاستلام' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-br from-orange-500/10 via-orange-500/5 to-transparent border border-orange-500/20 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center">
            <UtensilsCrossed className="w-6 h-6 text-orange-500" />
          </div>
          <div>
            <h2 className="text-lg font-bold">إحصائيات الأكلات</h2>
            <p className="text-sm text-muted-foreground">اسأل عن مبيعات وإحصائيات أي صنف</p>
          </div>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-success" />
            <span className="text-sm text-muted-foreground">الأكثر مبيعاً</span>
          </div>
          <p className="font-bold text-lg">{menuStats[0]?.name || '-'}</p>
          <p className="text-sm text-success">{toEnglishNumbers(menuStats[0]?.total_sold || 0)} قطعة</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            <span className="text-sm text-muted-foreground">إجمالي الإيرادات</span>
          </div>
          <p className="font-bold text-lg text-primary">
            {formatNumber(menuStats.reduce((sum, item) => sum + item.total_revenue, 0))}
          </p>
          <p className="text-sm text-muted-foreground">دينار</p>
        </div>
      </div>

      {/* Menu Items List */}
      <div className="bg-card border border-border rounded-xl p-4">
        <h3 className="font-bold mb-3 flex items-center gap-2">
          <Package className="w-5 h-5 text-muted-foreground" />
          جميع الأصناف
        </h3>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {menuStats.map(item => (
            <div 
              key={item.id}
              onClick={() => setSelectedItem(selectedItem?.id === item.id ? null : item)}
              className={`p-3 rounded-lg cursor-pointer transition-all ${
                selectedItem?.id === item.id 
                  ? 'bg-primary/10 border border-primary/30' 
                  : 'bg-muted/50 hover:bg-muted'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.category}</p>
                </div>
                <div className="text-left">
                  <p className="font-bold text-primary">{toEnglishNumbers(item.total_sold)}</p>
                  <p className="text-xs text-muted-foreground">مبيعات</p>
                </div>
              </div>
              
              {selectedItem?.id === item.id && (
                <div className="mt-3 pt-3 border-t border-border space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="bg-background rounded p-2">
                      <p className="text-muted-foreground text-xs">توصيل</p>
                      <p className="font-medium">{toEnglishNumbers(item.delivery_count)}</p>
                    </div>
                    <div className="bg-background rounded p-2">
                      <p className="text-muted-foreground text-xs">استلام</p>
                      <p className="font-medium">{toEnglishNumbers(item.takeaway_count)}</p>
                    </div>
                  </div>
                  <div className="bg-background rounded p-2">
                    <p className="text-muted-foreground text-xs mb-1">الإيرادات</p>
                    <p className="font-medium text-success">{formatNumber(item.total_revenue)} دينار</p>
                  </div>
                  {item.areas.length > 0 && (
                    <div className="bg-background rounded p-2">
                      <p className="text-muted-foreground text-xs mb-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        المناطق
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {item.areas.slice(0, 5).map((area, idx) => (
                          <span key={idx} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                            {area.name}: {toEnglishNumbers(area.count)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Chat Section */}
      <div className="bg-card border border-border rounded-xl p-4">
        <h3 className="font-bold mb-3">اسأل عن الأكلات</h3>
        
        {/* Quick Questions */}
        <div className="flex flex-wrap gap-2 mb-4">
          {quickQuestions.map((q, idx) => (
            <Button
              key={idx}
              variant="outline"
              size="sm"
              onClick={() => {
                setQuestion(q.question);
              }}
              className="text-xs"
            >
              {q.label}
            </Button>
          ))}
        </div>

        {/* Chat History */}
        {chatHistory.length > 0 && (
          <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
            {chatHistory.map(msg => (
              <div 
                key={msg.id}
                className={`p-3 rounded-lg ${
                  msg.role === 'user' 
                    ? 'bg-primary/10 border border-primary/20 mr-8' 
                    : 'bg-muted/50 ml-8'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              </div>
            ))}
            {isAsking && (
              <div className="p-3 rounded-lg bg-muted/50 ml-8 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm text-muted-foreground">جاري التفكير...</span>
              </div>
            )}
          </div>
        )}

        {/* Input */}
        <div className="flex gap-2">
          <Input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="اكتب سؤالك عن الأكلات..."
            onKeyPress={(e) => e.key === 'Enter' && !isAsking && askQuestion()}
            className="flex-1"
            dir="rtl"
          />
          <Button 
            onClick={askQuestion} 
            disabled={!question.trim() || isAsking}
            size="icon"
          >
            {isAsking ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
