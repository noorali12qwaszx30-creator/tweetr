import { useMemo } from 'react';
import { Order } from '@/types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Clock } from 'lucide-react';
import { toEnglishNumbers } from '@/lib/formatNumber';

interface OrdersChartProps {
  orders: Order[];
  title?: string;
}

export function OrdersChart({ orders, title = 'الطلبات حسب الساعة' }: OrdersChartProps) {
  const hourlyData = useMemo(() => {
    const hours: Record<number, number> = {};
    
    // Initialize all hours
    for (let i = 0; i < 24; i++) {
      hours[i] = 0;
    }
    
    // Count orders per hour
    orders.forEach(order => {
      const hour = new Date(order.createdAt).getHours();
      hours[hour]++;
    });

    return Object.entries(hours).map(([hour, count]) => ({
      hour: toEnglishNumbers(`${hour}:00`),
      orders: count,
      hourNum: parseInt(hour),
    }));
  }, [orders]);

  const peakHour = useMemo(() => {
    const max = Math.max(...hourlyData.map(d => d.orders));
    const peak = hourlyData.find(d => d.orders === max);
    return peak;
  }, [hourlyData]);

  return (
    <div className="bg-card border border-border rounded-xl p-4 shadow-soft">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" />
          {title}
        </h3>
        {peakHour && peakHour.orders > 0 && (
          <div className="flex items-center gap-2 text-sm bg-primary/10 text-primary px-3 py-1 rounded-full">
            <TrendingUp className="w-4 h-4" />
            <span>ذروة: {peakHour.hour}</span>
          </div>
        )}
      </div>
      
      {orders.length === 0 ? (
        <div className="h-[200px] flex items-center justify-center text-muted-foreground">
          لا توجد بيانات
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={hourlyData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="hour" 
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              tickLine={false}
              interval={2}
            />
            <YAxis 
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip 
              contentStyle={{ 
                background: 'hsl(var(--card))', 
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                direction: 'rtl'
              }}
            labelFormatter={(label) => `الساعة ${toEnglishNumbers(label)}`}
            formatter={(value: number) => [`${toEnglishNumbers(value)} طلب`, 'العدد']}
            />
            <Bar 
              dataKey="orders" 
              fill="hsl(var(--primary))" 
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

interface WeeklyChartProps {
  orders: Order[];
}

export function WeeklyChart({ orders }: WeeklyChartProps) {
  const weeklyData = useMemo(() => {
    const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const dayStats: Record<number, { orders: number; revenue: number }> = {};
    
    for (let i = 0; i < 7; i++) {
      dayStats[i] = { orders: 0, revenue: 0 };
    }
    
    orders.forEach(order => {
      const day = new Date(order.createdAt).getDay();
      dayStats[day].orders++;
      if (order.status === 'delivered') {
        // Revenue = totalPrice - deliveryFee (excluding delivery fees)
        dayStats[day].revenue += order.totalPrice - (order.deliveryFee || 0);
      }
    });

    return days.map((name, idx) => ({
      name,
      orders: dayStats[idx].orders,
      revenue: dayStats[idx].revenue,
    }));
  }, [orders]);

  return (
    <div className="bg-card border border-border rounded-xl p-4 shadow-soft">
      <h3 className="font-bold mb-4 flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-primary" />
        أداء الأسبوع
      </h3>
      
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={weeklyData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis 
            dataKey="name" 
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            tickLine={false}
          />
          <YAxis 
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip 
            contentStyle={{ 
              background: 'hsl(var(--card))', 
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              direction: 'rtl'
            }}
            formatter={(value: number, name: string) => [
              name === 'orders' ? `${toEnglishNumbers(value)} طلب` : `${formatNumberWithCommas(value)} د.ع`,
              name === 'orders' ? 'الطلبات' : 'الإيراد'
            ]}
          />
          <Line 
            type="monotone" 
            dataKey="orders" 
            stroke="hsl(var(--primary))" 
            strokeWidth={2}
            dot={{ fill: 'hsl(var(--primary))' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
