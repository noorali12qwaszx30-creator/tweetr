import { useMemo } from 'react';
import { useDeliveryAreas } from '@/hooks/useDeliveryAreas';
import { OrderWithItems } from '@/hooks/useSupabaseOrders';
import { 
  MapPin, 
  TrendingUp, 
  Package, 
  BarChart3,
  Loader2
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';

interface DeliveryAreaAnalyticsProps {
  orders: OrderWithItems[];
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  '#10b981',
  '#f59e0b',
  '#6366f1',
  '#ec4899',
  '#8b5cf6',
];

export function DeliveryAreaAnalytics({ orders }: DeliveryAreaAnalyticsProps) {
  const { areas, loading } = useDeliveryAreas();

  const areaStats = useMemo(() => {
    // Count orders per area (delivery orders only)
    const deliveryOrders = orders.filter(o => o.type === 'delivery' && o.status === 'delivered');
    
    // Group by customer_address (which now matches area names)
    const addressCounts: Record<string, { count: number; revenue: number }> = {};
    
    deliveryOrders.forEach(order => {
      const address = order.customer_address || 'غير محدد';
      if (!addressCounts[address]) {
        addressCounts[address] = { count: 0, revenue: 0 };
      }
      addressCounts[address].count++;
      addressCounts[address].revenue += Number(order.total_price);
    });

    // Merge with areas data for order_count from database
    const mergedStats = areas.map(area => {
      const orderData = addressCounts[area.name] || { count: 0, revenue: 0 };
      return {
        id: area.id,
        name: area.name,
        orderCount: area.order_count || orderData.count,
        revenue: orderData.revenue,
        isActive: area.is_active,
      };
    });

    // Add any addresses not in areas (legacy data)
    Object.entries(addressCounts).forEach(([address, data]) => {
      if (!areas.find(a => a.name === address) && address !== 'غير محدد') {
        mergedStats.push({
          id: address,
          name: address,
          orderCount: data.count,
          revenue: data.revenue,
          isActive: false,
        });
      }
    });

    return mergedStats.sort((a, b) => b.orderCount - a.orderCount);
  }, [orders, areas]);

  const topAreas = areaStats.slice(0, 5);
  const totalOrders = areaStats.reduce((sum, a) => sum + a.orderCount, 0);
  const totalRevenue = areaStats.reduce((sum, a) => sum + a.revenue, 0);

  const pieData = topAreas.map(area => ({
    name: area.name,
    value: area.orderCount,
  }));

  const barData = topAreas.map(area => ({
    name: area.name.length > 10 ? area.name.slice(0, 10) + '...' : area.name,
    fullName: area.name,
    orders: area.orderCount,
    revenue: Math.round(area.revenue / 1000), // Convert to thousands
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card border border-border rounded-xl p-4 shadow-soft">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="w-5 h-5 text-primary" />
            <span className="text-sm text-muted-foreground">المناطق النشطة</span>
          </div>
          <p className="text-2xl font-bold text-primary">{areas.filter(a => a.is_active).length}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 shadow-soft">
          <div className="flex items-center gap-2 mb-2">
            <Package className="w-5 h-5 text-primary" />
            <span className="text-sm text-muted-foreground">إجمالي الطلبات</span>
          </div>
          <p className="text-2xl font-bold text-primary">{totalOrders}</p>
        </div>
      </div>

      {/* Top Areas Ranking */}
      <div className="bg-card border border-border rounded-xl p-4 shadow-soft">
        <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          أكثر المناطق طلباً
        </h3>
        
        {areaStats.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MapPin className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>لا توجد بيانات متاحة</p>
          </div>
        ) : (
          <div className="space-y-3">
            {topAreas.map((area, index) => {
              const percentage = totalOrders > 0 ? (area.orderCount / totalOrders) * 100 : 0;
              return (
                <div key={area.id} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span 
                        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-primary-foreground"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      >
                        {index + 1}
                      </span>
                      <span className="font-medium text-sm">{area.name}</span>
                    </div>
                    <div className="text-left">
                      <span className="font-bold text-primary">{area.orderCount}</span>
                      <span className="text-xs text-muted-foreground mr-1">طلب</span>
                    </div>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ 
                        width: `${percentage}%`,
                        backgroundColor: COLORS[index % COLORS.length]
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{percentage.toFixed(1)}% من الطلبات</span>
                    <span>{area.revenue.toLocaleString()} د.ع</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pie Chart - Distribution */}
      {pieData.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4 shadow-soft">
          <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            توزيع الطلبات حسب المنطقة
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  labelLine={false}
                >
                  {pieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => [`${value} طلب`, 'الطلبات']}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    direction: 'rtl'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Bar Chart - Orders & Revenue */}
      {barData.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4 shadow-soft">
          <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            الطلبات والإيرادات حسب المنطقة
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} layout="vertical">
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 12 }} />
                <Tooltip 
                  formatter={(value: number, name: string) => [
                    name === 'orders' ? `${value} طلب` : `${value}K د.ع`,
                    name === 'orders' ? 'الطلبات' : 'الإيرادات'
                  ]}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    direction: 'rtl'
                  }}
                />
                <Legend 
                  formatter={(value) => value === 'orders' ? 'الطلبات' : 'الإيرادات (ألف)'}
                />
                <Bar dataKey="orders" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                <Bar dataKey="revenue" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* All Areas Table */}
      {areaStats.length > 5 && (
        <div className="bg-card border border-border rounded-xl p-4 shadow-soft">
          <h3 className="font-bold text-sm mb-4">جميع المناطق</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-right py-2 px-2">المنطقة</th>
                  <th className="text-center py-2 px-2">الطلبات</th>
                  <th className="text-center py-2 px-2">الإيرادات</th>
                  <th className="text-center py-2 px-2">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {areaStats.map((area) => (
                  <tr key={area.id} className="border-b border-border/50">
                    <td className="py-2 px-2 font-medium">{area.name}</td>
                    <td className="py-2 px-2 text-center">{area.orderCount}</td>
                    <td className="py-2 px-2 text-center">{area.revenue.toLocaleString()}</td>
                    <td className="py-2 px-2 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${
                        area.isActive 
                          ? 'bg-success/10 text-success' 
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        {area.isActive ? 'نشط' : 'غير نشط'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
