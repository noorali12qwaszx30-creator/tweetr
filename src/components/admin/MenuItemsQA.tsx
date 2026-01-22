import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, UtensilsCrossed, Send, TrendingUp, MapPin, Package, BarChart3, Database, RefreshCcw } from 'lucide-react';
import { formatNumber, toEnglishNumbers } from '@/lib/formatNumber';
import { toast } from 'sonner';

interface MenuItemStats {
  id: string;
  menu_item_id: string | null;
  menu_item_name: string;
  category: string;
  total_quantity_sold: number;
  total_revenue: number;
  delivery_quantity: number;
  takeaway_quantity: number;
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

  // Fetch permanent menu item statistics
  const fetchMenuStats = useCallback(async () => {
    try {
      // Fetch from permanent statistics table
      const { data: stats, error: statsError } = await supabase
        .from('menu_item_statistics' as any)
        .select('*')
        .order('total_quantity_sold', { ascending: false });
      
      if (statsError) throw statsError;

      // Fetch area breakdowns
      const { data: areaStats, error: areaError } = await supabase
        .from('menu_item_area_stats' as any)
        .select('*');
      
      if (areaError) throw areaError;

      // Group area stats by menu item
      const areasByItem: Record<string, { name: string; count: number }[]> = {};
      (areaStats || []).forEach((area: any) => {
        if (!areasByItem[area.menu_item_name]) {
          areasByItem[area.menu_item_name] = [];
        }
        areasByItem[area.menu_item_name].push({
          name: area.delivery_area_name,
          count: area.quantity_sold
        });
      });

      // Sort areas by count
      Object.keys(areasByItem).forEach(key => {
        areasByItem[key].sort((a, b) => b.count - a.count);
      });

      const formattedStats: MenuItemStats[] = (stats || []).map((item: any) => ({
        id: item.id,
        menu_item_id: item.menu_item_id,
        menu_item_name: item.menu_item_name,
        category: item.category || '',
        total_quantity_sold: item.total_quantity_sold || 0,
        total_revenue: Number(item.total_revenue) || 0,
        delivery_quantity: item.delivery_quantity || 0,
        takeaway_quantity: item.takeaway_quantity || 0,
        areas: areasByItem[item.menu_item_name] || []
      }));

      setMenuStats(formattedStats);
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
        name: item.menu_item_name,
        category: item.category,
        total_sold: item.total_quantity_sold,
        revenue: item.total_revenue,
        delivery: item.delivery_quantity,
        takeaway: item.takeaway_quantity,
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

  const totalSold = menuStats.reduce((sum, item) => sum + item.total_quantity_sold, 0);
  const totalRevenue = menuStats.reduce((sum, item) => sum + item.total_revenue, 0);

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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center">
              <UtensilsCrossed className="w-6 h-6 text-orange-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                إحصائيات الأكلات الدائمة
                <Database className="w-4 h-4 text-orange-500" />
              </h2>
              <p className="text-sm text-muted-foreground">لا تتأثر بحذف الطلبات أو إعادة الضبط</p>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => {
              setLoading(true);
              fetchMenuStats();
            }}
          >
            <RefreshCcw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-success" />
            <span className="text-sm text-muted-foreground">إجمالي المبيعات</span>
          </div>
          <p className="font-bold text-2xl text-success">{toEnglishNumbers(totalSold)}</p>
          <p className="text-xs text-muted-foreground">قطعة مباعة</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            <span className="text-sm text-muted-foreground">إجمالي الإيرادات</span>
          </div>
          <p className="font-bold text-2xl text-primary">
            {formatNumber(totalRevenue)}
          </p>
          <p className="text-xs text-muted-foreground">دينار</p>
        </div>
      </div>

      {/* Top Seller */}
      {menuStats.length > 0 && (
        <div className="bg-gradient-to-r from-success/10 to-success/5 border border-success/20 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-success mb-1">🏆 الأكثر مبيعاً</p>
              <p className="font-bold text-lg">{menuStats[0]?.menu_item_name}</p>
              <p className="text-sm text-muted-foreground">{menuStats[0]?.category}</p>
            </div>
            <div className="text-left">
              <p className="text-2xl font-bold text-success">{toEnglishNumbers(menuStats[0]?.total_quantity_sold || 0)}</p>
              <p className="text-xs text-muted-foreground">قطعة</p>
            </div>
          </div>
        </div>
      )}

      {/* Menu Items List */}
      <div className="bg-card border border-border rounded-xl p-4">
        <h3 className="font-bold mb-3 flex items-center gap-2">
          <Package className="w-5 h-5 text-muted-foreground" />
          جميع الأصناف ({toEnglishNumbers(menuStats.length)})
        </h3>
        
        {menuStats.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Database className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>لا توجد إحصائيات بعد</p>
            <p className="text-xs">ستظهر الإحصائيات عند اكتمال الطلبات</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {menuStats.map((item, index) => (
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
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-5">{toEnglishNumbers(index + 1)}</span>
                    <div>
                      <p className="font-medium">{item.menu_item_name}</p>
                      <p className="text-xs text-muted-foreground">{item.category}</p>
                    </div>
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-primary">{toEnglishNumbers(item.total_quantity_sold)}</p>
                    <p className="text-xs text-muted-foreground">مبيعات</p>
                  </div>
                </div>
                
                {selectedItem?.id === item.id && (
                  <div className="mt-3 pt-3 border-t border-border space-y-2">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="bg-background rounded p-2">
                        <p className="text-muted-foreground text-xs">توصيل</p>
                        <p className="font-medium">{toEnglishNumbers(item.delivery_quantity)}</p>
                      </div>
                      <div className="bg-background rounded p-2">
                        <p className="text-muted-foreground text-xs">استلام</p>
                        <p className="font-medium">{toEnglishNumbers(item.takeaway_quantity)}</p>
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
        )}
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
