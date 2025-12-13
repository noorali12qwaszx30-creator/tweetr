import { useMemo } from 'react';
import { Order } from '@/types';
import { Users, UserPlus, UserCheck, MapPin, DollarSign, TrendingUp } from 'lucide-react';

interface CustomerAnalyticsProps {
  orders: Order[];
}

export function CustomerAnalytics({ orders }: CustomerAnalyticsProps) {
  const analytics = useMemo(() => {
    const customerOrders: Record<string, { orders: number; totalSpent: number; name: string }> = {};
    const areas: Record<string, number> = {};

    orders.forEach(order => {
      const phone = order.customer.phone;
      if (!customerOrders[phone]) {
        customerOrders[phone] = { orders: 0, totalSpent: 0, name: order.customer.name };
      }
      customerOrders[phone].orders++;
      if (order.status === 'delivered') {
        customerOrders[phone].totalSpent += order.totalPrice;
      }

      // Track areas from address (simplified)
      const area = order.customer.address.split(' ')[0] || 'غير محدد';
      areas[area] = (areas[area] || 0) + 1;
    });

    const customers = Object.values(customerOrders);
    const totalCustomers = customers.length;
    const newCustomers = customers.filter(c => c.orders === 1).length;
    const returningCustomers = totalCustomers - newCustomers;
    const avgOrderValue = customers.length > 0 
      ? customers.reduce((sum, c) => sum + c.totalSpent, 0) / customers.reduce((sum, c) => sum + c.orders, 0)
      : 0;

    const topCustomers = customers
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10);

    const topAreas = Object.entries(areas)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    return {
      totalCustomers,
      newCustomers,
      returningCustomers,
      avgOrderValue,
      topCustomers,
      topAreas,
    };
  }, [orders]);

  return (
    <div className="space-y-4">
      {/* Customer Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-card border border-border rounded-xl p-4 shadow-soft">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-5 h-5 text-primary" />
            <p className="text-muted-foreground text-sm">إجمالي العملاء</p>
          </div>
          <p className="text-2xl font-bold">{analytics.totalCustomers}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 shadow-soft">
          <div className="flex items-center gap-2 mb-2">
            <UserPlus className="w-5 h-5 text-success" />
            <p className="text-muted-foreground text-sm">عملاء جدد</p>
          </div>
          <p className="text-2xl font-bold text-success">{analytics.newCustomers}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 shadow-soft">
          <div className="flex items-center gap-2 mb-2">
            <UserCheck className="w-5 h-5 text-info" />
            <p className="text-muted-foreground text-sm">عملاء عائدون</p>
          </div>
          <p className="text-2xl font-bold text-info">{analytics.returningCustomers}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 shadow-soft">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-5 h-5 text-warning" />
            <p className="text-muted-foreground text-sm">متوسط الطلب</p>
          </div>
          <p className="text-2xl font-bold text-warning">{Math.round(analytics.avgOrderValue).toLocaleString()}</p>
        </div>
      </div>

      {/* Top Customers */}
      <div className="bg-card border border-border rounded-xl p-4 shadow-soft">
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          أعلى العملاء صرفاً
        </h3>
        {analytics.topCustomers.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">لا توجد بيانات</p>
        ) : (
          <div className="space-y-2">
            {analytics.topCustomers.map((customer, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 flex items-center justify-center bg-primary/10 text-primary rounded-full text-xs font-bold">
                    {idx + 1}
                  </span>
                  <span className="font-medium">{customer.name}</span>
                </div>
                <div className="text-left">
                  <p className="font-bold text-success">{customer.totalSpent.toLocaleString()} د.ع</p>
                  <p className="text-xs text-muted-foreground">{customer.orders} طلب</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
