import { useMemo } from 'react';
import { OrderWithItems } from '@/hooks/useSupabaseOrders';
import { formatNumberWithCommas, toEnglishNumbers } from '@/lib/formatNumber';
import { 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  ChefHat,
  Truck,
  Clock,
  Activity
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  ReferenceLine
} from 'recharts';

interface PredictiveAnalysisProps {
  orders: OrderWithItems[];
}

export function PredictiveAnalysis({ orders }: PredictiveAnalysisProps) {
  // Calculate historical averages
  const historicalStats = useMemo(() => {
    const now = new Date();
    const last7Days = orders.filter(o => {
      const orderDate = new Date(o.created_at);
      return (now.getTime() - orderDate.getTime()) <= 7 * 24 * 60 * 60 * 1000;
    });

    const totalOrders = last7Days.length;
    const delayedOrders = last7Days.filter(o => {
      if (o.status === 'delivered' && o.delivered_at) {
        const duration = new Date(o.delivered_at).getTime() - new Date(o.created_at).getTime();
        return duration > 45 * 60 * 1000; // More than 45 minutes
      }
      return false;
    }).length;

    const avgDeliveryTime = last7Days
      .filter(o => o.status === 'delivered' && o.delivered_at)
      .reduce((sum, o) => {
        const duration = (new Date(o.delivered_at!).getTime() - new Date(o.created_at).getTime()) / 60000;
        return sum + duration;
      }, 0) / (last7Days.filter(o => o.status === 'delivered').length || 1);

    return {
      avgOrdersPerDay: totalOrders / 7,
      delayRate: totalOrders > 0 ? (delayedOrders / totalOrders) * 100 : 0,
      avgDeliveryTime
    };
  }, [orders]);

  // Current active orders analysis
  const currentAnalysis = useMemo(() => {
    const activeOrders = orders.filter(o => !['delivered', 'cancelled'].includes(o.status));
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    const delayed = activeOrders.filter(o => new Date(o.created_at) < thirtyMinutesAgo);
    
    return {
      active: activeOrders.length,
      preparing: activeOrders.filter(o => o.status === 'preparing').length,
      ready: activeOrders.filter(o => o.status === 'ready').length,
      delivering: activeOrders.filter(o => o.status === 'delivering').length,
      pending: activeOrders.filter(o => o.status === 'pending').length,
      delayed: delayed.length,
      delayRate: activeOrders.length > 0 ? (delayed.length / activeOrders.length) * 100 : 0
    };
  }, [orders]);

  // Hourly order distribution (for predictions)
  const hourlyDistribution = useMemo(() => {
    const hours: Record<number, number[]> = {};
    const now = new Date();
    
    // Get last 7 days data
    orders.forEach(o => {
      const orderDate = new Date(o.created_at);
      if ((now.getTime() - orderDate.getTime()) <= 7 * 24 * 60 * 60 * 1000) {
        const hour = orderDate.getHours();
        if (!hours[hour]) hours[hour] = [];
        hours[hour].push(1);
      }
    });

    // Calculate average per hour
    const currentHour = now.getHours();
    const data = [];
    
    for (let i = 0; i < 24; i++) {
      const hour = (currentHour + i) % 24;
      const avg = hours[hour] ? hours[hour].length / 7 : 0;
      data.push({
        hour: `${hour}:00`,
        predicted: Math.round(avg),
        isCurrent: i === 0,
        isFuture: i > 0
      });
    }
    
    return data.slice(0, 12); // Next 12 hours
  }, [orders]);

  // Congestion prediction
  const congestionAnalysis = useMemo(() => {
    const kitchen = currentAnalysis.preparing + currentAnalysis.pending;
    const delivery = currentAnalysis.delivering;
    const ready = currentAnalysis.ready;
    
    // Get unique delivery persons currently active
    const activeDrivers = new Set(
      orders
        .filter(o => o.status === 'delivering' && o.delivery_person_id)
        .map(o => o.delivery_person_id)
    ).size;

    const kitchenLoad = kitchen > 10 ? 'high' : kitchen > 5 ? 'medium' : 'low';
    const deliveryLoad = activeDrivers > 0 && delivery / activeDrivers > 3 ? 'high' : 
                         activeDrivers > 0 && delivery / activeDrivers > 2 ? 'medium' : 'low';
    const waitingLoad = ready > 5 ? 'high' : ready > 2 ? 'medium' : 'low';

    return {
      kitchen: { count: kitchen, load: kitchenLoad },
      delivery: { count: delivery, drivers: activeDrivers, load: deliveryLoad },
      waiting: { count: ready, load: waitingLoad }
    };
  }, [currentAnalysis, orders]);

  // Performance comparison
  const performanceComparison = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayOrders = orders.filter(o => new Date(o.created_at) >= today);
    const todayCompleted = todayOrders.filter(o => o.status === 'delivered').length;
    const todayCancelled = todayOrders.filter(o => o.status === 'cancelled').length;
    
    const completionRate = todayOrders.length > 0 
      ? (todayCompleted / todayOrders.length) * 100 
      : 0;
    
    const avgCompletionRate = 85; // Assumed average
    
    return {
      todayTotal: todayOrders.length,
      todayCompleted,
      todayCancelled,
      completionRate,
      vsAverage: completionRate - avgCompletionRate,
      avgOrdersPerDay: Math.round(historicalStats.avgOrdersPerDay)
    };
  }, [orders, historicalStats]);

  const getLoadColor = (load: string) => {
    switch (load) {
      case 'high': return 'text-destructive bg-destructive/10';
      case 'medium': return 'text-warning bg-warning/10';
      default: return 'text-success bg-success/10';
    }
  };

  const getLoadLabel = (load: string) => {
    switch (load) {
      case 'high': return 'مرتفع';
      case 'medium': return 'متوسط';
      default: return 'طبيعي';
    }
  };

  return (
    <div className="space-y-4">
      {/* Current Status Overview */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card border border-border rounded-xl p-4 shadow-soft">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-primary" />
            <span className="text-sm text-muted-foreground">الطلبات النشطة</span>
          </div>
          <p className="text-2xl font-bold">{toEnglishNumbers(currentAnalysis.active)}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {toEnglishNumbers(currentAnalysis.delayed)} متأخر
          </p>
        </div>
        
        <div className="bg-card border border-border rounded-xl p-4 shadow-soft">
          <div className="flex items-center gap-2 mb-2">
            {performanceComparison.vsAverage >= 0 ? (
              <TrendingUp className="w-4 h-4 text-success" />
            ) : (
              <TrendingDown className="w-4 h-4 text-destructive" />
            )}
            <span className="text-sm text-muted-foreground">نسبة الإتمام</span>
          </div>
          <p className="text-2xl font-bold">
            {toEnglishNumbers(Math.round(performanceComparison.completionRate))}%
          </p>
          <p className={`text-xs mt-1 ${performanceComparison.vsAverage >= 0 ? 'text-success' : 'text-destructive'}`}>
            {performanceComparison.vsAverage >= 0 ? '+' : ''}{toEnglishNumbers(Math.round(performanceComparison.vsAverage))}% من المتوسط
          </p>
        </div>
      </div>

      {/* Congestion Analysis */}
      <div className="bg-card border border-border rounded-xl p-4 shadow-soft">
        <h3 className="font-bold mb-4 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-warning" />
          تحليل اختناق الأقسام
        </h3>
        
        <div className="grid grid-cols-3 gap-3">
          {/* Kitchen */}
          <div className="text-center">
            <div className={`w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center ${getLoadColor(congestionAnalysis.kitchen.load)}`}>
              <ChefHat className="w-6 h-6" />
            </div>
            <p className="font-medium text-sm">المطبخ</p>
            <p className="text-xl font-bold">{toEnglishNumbers(congestionAnalysis.kitchen.count)}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full ${getLoadColor(congestionAnalysis.kitchen.load)}`}>
              {getLoadLabel(congestionAnalysis.kitchen.load)}
            </span>
          </div>

          {/* Delivery */}
          <div className="text-center">
            <div className={`w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center ${getLoadColor(congestionAnalysis.delivery.load)}`}>
              <Truck className="w-6 h-6" />
            </div>
            <p className="font-medium text-sm">التوصيل</p>
            <p className="text-xl font-bold">{toEnglishNumbers(congestionAnalysis.delivery.count)}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full ${getLoadColor(congestionAnalysis.delivery.load)}`}>
              {toEnglishNumbers(congestionAnalysis.delivery.drivers)} سائق
            </span>
          </div>

          {/* Waiting */}
          <div className="text-center">
            <div className={`w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center ${getLoadColor(congestionAnalysis.waiting.load)}`}>
              <Clock className="w-6 h-6" />
            </div>
            <p className="font-medium text-sm">بانتظار التوصيل</p>
            <p className="text-xl font-bold">{toEnglishNumbers(congestionAnalysis.waiting.count)}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full ${getLoadColor(congestionAnalysis.waiting.load)}`}>
              {getLoadLabel(congestionAnalysis.waiting.load)}
            </span>
          </div>
        </div>
      </div>

      {/* Hourly Prediction Chart */}
      <div className="bg-card border border-border rounded-xl p-4 shadow-soft">
        <h3 className="font-bold mb-4 text-sm flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          توقع الطلبات للساعات القادمة
        </h3>
        
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={hourlyDistribution}>
              <defs>
                <linearGradient id="colorPredicted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="hour" 
                tick={{ fontSize: 10 }}
                interval={1}
              />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip 
                formatter={(value: number) => [`${toEnglishNumbers(value)} طلب متوقع`, '']}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  direction: 'rtl'
                }}
              />
              <Area
                type="monotone"
                dataKey="predicted"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorPredicted)"
              />
              <ReferenceLine x={hourlyDistribution[0]?.hour} stroke="hsl(var(--destructive))" strokeDasharray="3 3" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        
        <p className="text-xs text-muted-foreground text-center mt-2">
          * التوقعات مبنية على متوسط آخر 7 أيام
        </p>
      </div>

      {/* Performance Summary */}
      <div className="bg-card border border-border rounded-xl p-4 shadow-soft">
        <h3 className="font-bold mb-4 text-sm">ملخص الأداء اليومي</h3>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <span className="text-sm">إجمالي طلبات اليوم</span>
            <span className="font-bold">{toEnglishNumbers(performanceComparison.todayTotal)}</span>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-success/10 rounded-lg">
            <span className="text-sm text-success">الطلبات المكتملة</span>
            <span className="font-bold text-success">{toEnglishNumbers(performanceComparison.todayCompleted)}</span>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-destructive/10 rounded-lg">
            <span className="text-sm text-destructive">الطلبات الملغية</span>
            <span className="font-bold text-destructive">{toEnglishNumbers(performanceComparison.todayCancelled)}</span>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg">
            <span className="text-sm">متوسط الطلبات يومياً</span>
            <span className="font-bold text-primary">{toEnglishNumbers(performanceComparison.avgOrdersPerDay)}</span>
          </div>

          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <span className="text-sm">متوسط وقت التوصيل</span>
            <span className="font-bold">{toEnglishNumbers(Math.round(historicalStats.avgDeliveryTime))} دقيقة</span>
          </div>
        </div>
      </div>

      {/* Insights */}
      <div className="bg-card border border-border rounded-xl p-4 shadow-soft">
        <h3 className="font-bold mb-3 text-sm">رؤى تحليلية</h3>
        
        <div className="space-y-2 text-sm">
          {currentAnalysis.delayed > 0 && (
            <div className="flex items-start gap-2 p-2 bg-destructive/10 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
              <p className="text-destructive">
                يوجد {toEnglishNumbers(currentAnalysis.delayed)} طلب متأخر (أكثر من 30 دقيقة)
              </p>
            </div>
          )}
          
          {congestionAnalysis.kitchen.load === 'high' && (
            <div className="flex items-start gap-2 p-2 bg-warning/10 rounded-lg">
              <ChefHat className="w-4 h-4 text-warning mt-0.5 flex-shrink-0" />
              <p className="text-warning">
                المطبخ تحت ضغط مرتفع - {toEnglishNumbers(congestionAnalysis.kitchen.count)} طلب قيد التجهيز
              </p>
            </div>
          )}
          
          {congestionAnalysis.waiting.load === 'high' && (
            <div className="flex items-start gap-2 p-2 bg-warning/10 rounded-lg">
              <Clock className="w-4 h-4 text-warning mt-0.5 flex-shrink-0" />
              <p className="text-warning">
                {toEnglishNumbers(congestionAnalysis.waiting.count)} طلب جاهز بانتظار التوصيل
              </p>
            </div>
          )}
          
          {performanceComparison.vsAverage < -10 && (
            <div className="flex items-start gap-2 p-2 bg-destructive/10 rounded-lg">
              <TrendingDown className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
              <p className="text-destructive">
                نسبة الإتمام أقل من المتوسط بـ {toEnglishNumbers(Math.abs(Math.round(performanceComparison.vsAverage)))}%
              </p>
            </div>
          )}
          
          {currentAnalysis.delayed === 0 && congestionAnalysis.kitchen.load === 'low' && (
            <div className="flex items-start gap-2 p-2 bg-success/10 rounded-lg">
              <TrendingUp className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
              <p className="text-success">
                الأداء التشغيلي ممتاز - لا توجد اختناقات حالياً
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
