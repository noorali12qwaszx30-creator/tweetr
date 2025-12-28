import { useState, useMemo } from 'react';
import { OrderWithItems } from '@/hooks/useSupabaseOrders';
import { formatNumberWithCommas, toEnglishNumbers } from '@/lib/formatNumber';
import { 
  Edit3, 
  RotateCcw, 
  Package,
  Calendar,
  Filter
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface BehaviorAnalysisProps {
  orders: OrderWithItems[];
}

type TimeFilter = 'day' | 'week' | 'month' | 'all';

export function BehaviorAnalysis({ orders }: BehaviorAnalysisProps) {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('week');

  // Filter orders by time
  const filteredOrders = useMemo(() => {
    const now = new Date();
    let startDate: Date;
    
    switch (timeFilter) {
      case 'day':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      default:
        return orders;
    }
    
    return orders.filter(o => new Date(o.created_at) >= startDate);
  }, [orders, timeFilter]);

  // Cashiers with most edits
  const cashierEdits = useMemo(() => {
    const edits: Record<string, { name: string; count: number }> = {};
    
    filteredOrders
      .filter(o => o.is_edited && o.cashier_name)
      .forEach(o => {
        const key = o.cashier_id || o.cashier_name || 'unknown';
        if (!edits[key]) {
          edits[key] = { name: o.cashier_name || 'غير معروف', count: 0 };
        }
        edits[key].count++;
      });
    
    return Object.values(edits)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [filteredOrders]);

  // Delivery persons with most returns/cancellations
  const deliveryReturns = useMemo(() => {
    const returns: Record<string, { name: string; count: number }> = {};
    
    filteredOrders
      .filter(o => o.status === 'cancelled' && o.delivery_person_name)
      .forEach(o => {
        const key = o.delivery_person_id || o.delivery_person_name || 'unknown';
        if (!returns[key]) {
          returns[key] = { name: o.delivery_person_name || 'غير معروف', count: 0 };
        }
        returns[key].count++;
      });
    
    return Object.values(returns)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [filteredOrders]);

  // Items with most edits (appearing in edited orders)
  const itemEdits = useMemo(() => {
    const items: Record<string, { name: string; count: number }> = {};
    
    filteredOrders
      .filter(o => o.is_edited)
      .forEach(o => {
        o.items.forEach(item => {
          const key = item.menu_item_name;
          if (!items[key]) {
            items[key] = { name: item.menu_item_name, count: 0 };
          }
          items[key].count++;
        });
      });
    
    return Object.values(items)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [filteredOrders]);

  const colors = [
    'hsl(var(--primary))',
    'hsl(var(--primary) / 0.9)',
    'hsl(var(--primary) / 0.8)',
    'hsl(var(--primary) / 0.7)',
    'hsl(var(--primary) / 0.6)',
    'hsl(var(--primary) / 0.5)',
    'hsl(var(--primary) / 0.4)',
    'hsl(var(--primary) / 0.3)',
    'hsl(var(--primary) / 0.25)',
    'hsl(var(--primary) / 0.2)',
  ];

  const timeFilterLabels: Record<TimeFilter, string> = {
    day: 'اليوم',
    week: 'الأسبوع',
    month: 'الشهر',
    all: 'الكل'
  };

  return (
    <div className="space-y-4">
      {/* Time Filter */}
      <div className="bg-card border border-border rounded-xl p-3 shadow-soft">
        <div className="flex items-center gap-2 mb-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">الفترة الزمنية</span>
        </div>
        <div className="flex gap-2 flex-wrap">
          {(Object.keys(timeFilterLabels) as TimeFilter[]).map(filter => (
            <button
              key={filter}
              onClick={() => setTimeFilter(filter)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                timeFilter === filter
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80'
              }`}
            >
              {timeFilterLabels[filter]}
            </button>
          ))}
        </div>
      </div>

      <Tabs defaultValue="cashiers" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="cashiers" className="text-xs gap-1">
            <Edit3 className="w-3 h-3" />
            تعديلات الكاشير
          </TabsTrigger>
          <TabsTrigger value="delivery" className="text-xs gap-1">
            <RotateCcw className="w-3 h-3" />
            إرجاعات التوصيل
          </TabsTrigger>
          <TabsTrigger value="items" className="text-xs gap-1">
            <Package className="w-3 h-3" />
            الأصناف المعدّلة
          </TabsTrigger>
        </TabsList>

        {/* Cashier Edits Tab */}
        <TabsContent value="cashiers" className="mt-4 space-y-4">
          <div className="bg-card border border-border rounded-xl p-4 shadow-soft">
            <h3 className="font-bold mb-3 text-sm flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-primary" />
              أكثر الكاشيرات تعديلاً للطلبات
            </h3>
            {cashierEdits.length === 0 ? (
              <p className="text-muted-foreground text-center py-8 text-sm">لا توجد بيانات تعديلات</p>
            ) : (
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={cashierEdits} layout="vertical">
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis 
                      type="category" 
                      dataKey="name" 
                      width={80}
                      tick={{ fontSize: 10 }}
                    />
                    <Tooltip 
                      formatter={(value: number) => [`${toEnglishNumbers(value)} تعديل`, '']}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        direction: 'rtl'
                      }}
                    />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                      {cashierEdits.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Detailed List */}
          {cashierEdits.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-4 shadow-soft">
              <h4 className="font-medium text-sm mb-3">الترتيب التفصيلي</h4>
              <div className="space-y-2">
                {cashierEdits.map((item, idx) => (
                  <div 
                    key={idx}
                    className="flex items-center justify-between p-2 bg-muted/50 rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 flex items-center justify-center bg-primary/10 text-primary rounded font-bold text-xs">
                        {toEnglishNumbers(idx + 1)}
                      </span>
                      <span className="font-medium text-sm">{item.name}</span>
                    </div>
                    <span className="font-bold text-primary">{toEnglishNumbers(item.count)} تعديل</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* Delivery Returns Tab */}
        <TabsContent value="delivery" className="mt-4 space-y-4">
          <div className="bg-card border border-border rounded-xl p-4 shadow-soft">
            <h3 className="font-bold mb-3 text-sm flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-destructive" />
              أكثر عمال التوصيل إرجاعاً للطلبات
            </h3>
            {deliveryReturns.length === 0 ? (
              <p className="text-muted-foreground text-center py-8 text-sm">لا توجد بيانات إرجاعات</p>
            ) : (
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={deliveryReturns} layout="vertical">
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis 
                      type="category" 
                      dataKey="name" 
                      width={80}
                      tick={{ fontSize: 10 }}
                    />
                    <Tooltip 
                      formatter={(value: number) => [`${toEnglishNumbers(value)} إرجاع`, '']}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        direction: 'rtl'
                      }}
                    />
                    <Bar dataKey="count" fill="hsl(var(--destructive))" radius={[0, 4, 4, 0]}>
                      {deliveryReturns.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={`hsl(var(--destructive) / ${1 - index * 0.08})`} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Detailed List */}
          {deliveryReturns.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-4 shadow-soft">
              <h4 className="font-medium text-sm mb-3">الترتيب التفصيلي</h4>
              <div className="space-y-2">
                {deliveryReturns.map((item, idx) => (
                  <div 
                    key={idx}
                    className="flex items-center justify-between p-2 bg-muted/50 rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 flex items-center justify-center bg-destructive/10 text-destructive rounded font-bold text-xs">
                        {toEnglishNumbers(idx + 1)}
                      </span>
                      <span className="font-medium text-sm">{item.name}</span>
                    </div>
                    <span className="font-bold text-destructive">{toEnglishNumbers(item.count)} إرجاع</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* Items Edits Tab */}
        <TabsContent value="items" className="mt-4 space-y-4">
          <div className="bg-card border border-border rounded-xl p-4 shadow-soft">
            <h3 className="font-bold mb-3 text-sm flex items-center gap-2">
              <Package className="w-4 h-4 text-warning" />
              أكثر الأصناف ظهوراً في الطلبات المعدّلة
            </h3>
            {itemEdits.length === 0 ? (
              <p className="text-muted-foreground text-center py-8 text-sm">لا توجد بيانات</p>
            ) : (
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={itemEdits} layout="vertical">
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis 
                      type="category" 
                      dataKey="name" 
                      width={100}
                      tick={{ fontSize: 10 }}
                    />
                    <Tooltip 
                      formatter={(value: number) => [`${toEnglishNumbers(value)} مرة`, '']}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        direction: 'rtl'
                      }}
                    />
                    <Bar dataKey="count" fill="hsl(var(--warning))" radius={[0, 4, 4, 0]}>
                      {itemEdits.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={`hsl(var(--warning) / ${1 - index * 0.08})`} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Detailed List */}
          {itemEdits.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-4 shadow-soft">
              <h4 className="font-medium text-sm mb-3">الترتيب التفصيلي</h4>
              <div className="space-y-2">
                {itemEdits.map((item, idx) => (
                  <div 
                    key={idx}
                    className="flex items-center justify-between p-2 bg-muted/50 rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 flex items-center justify-center bg-warning/10 text-warning rounded font-bold text-xs">
                        {toEnglishNumbers(idx + 1)}
                      </span>
                      <span className="font-medium text-sm">{item.name}</span>
                    </div>
                    <span className="font-bold text-warning">{toEnglishNumbers(item.count)} مرة</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
