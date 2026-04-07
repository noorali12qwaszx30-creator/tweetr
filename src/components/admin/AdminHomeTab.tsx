import { KPICard } from './KPICard';
import { OrdersChart } from './OrdersChart';
import { ActivityLogList } from './ActivityLogList';
import { formatNumberWithCommas, toEnglishNumbers } from '@/lib/formatNumber';
import { ClipboardList, CheckCircle, XCircle, DollarSign, TrendingUp } from 'lucide-react';
import { OrderWithItems } from '@/hooks/useSupabaseOrders';

interface AdminHomeTabProps {
  orders: OrderWithItems[];
  activityLogs: any[];
}

export function AdminHomeTab({ orders, activityLogs }: AdminHomeTabProps) {
  const totalOrders = orders.length;
  const completedOrders = orders.filter(o => o.status === 'delivered');
  const cancelledOrders = orders.filter(o => o.status === 'cancelled');
  const totalRevenue = completedOrders.reduce((sum, o) => sum + (Number(o.total_price) - Number(o.delivery_fee || 0)), 0);

  // Items stats
  const itemsStats: Record<string, { quantity: number; revenue: number }> = {};
  completedOrders.forEach(order => {
    order.items.forEach(item => {
      const key = item.menu_item_name;
      if (!itemsStats[key]) itemsStats[key] = { quantity: 0, revenue: 0 };
      itemsStats[key].quantity += item.quantity;
      itemsStats[key].revenue += Number(item.menu_item_price) * item.quantity;
    });
  });
  const sortedItems = Object.entries(itemsStats).sort(([, a], [, b]) => b.quantity - a.quantity);

  // Chart-compatible orders
  const ordersForCharts = orders.map(o => ({
    ...o,
    orderNumber: o.order_number,
    totalPrice: Number(o.total_price),
    deliveryFee: Number(o.delivery_fee || 0),
    createdAt: new Date(o.created_at),
    customer: { name: o.customer_name, phone: o.customer_phone, address: o.customer_address || '' },
    items: o.items.map(i => ({
      menuItem: { id: i.menu_item_id || '', name: i.menu_item_name, price: Number(i.menu_item_price), image: '', category: '' },
      quantity: i.quantity,
      notes: i.notes || undefined
    })),
    cashierName: o.cashier_name || ''
  }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard title="إجمالي الطلبات" value={totalOrders} icon={<ClipboardList className="w-5 h-5" />} />
        <KPICard title="المكتملة" value={completedOrders.length} icon={<CheckCircle className="w-5 h-5" />} variant="success" />
        <KPICard title="الملغية" value={cancelledOrders.length} icon={<XCircle className="w-5 h-5" />} variant="destructive" />
        <KPICard title="الإيرادات" value={totalRevenue} suffix="د.ع" icon={<DollarSign className="w-5 h-5" />} variant="success" />
      </div>

      <OrdersChart orders={ordersForCharts} />

      <div className="bg-card border border-border rounded-xl p-4 shadow-soft">
        <h3 className="font-bold mb-3 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          أكثر الأصناف مبيعاً
        </h3>
        {sortedItems.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">لا توجد بيانات</p>
        ) : (
          <div className="space-y-2">
            {sortedItems.slice(0, 5).map(([name, stats], idx) => (
              <div key={name} className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg">
                <span className="w-7 h-7 flex items-center justify-center bg-primary/10 text-primary rounded-lg font-bold text-sm">
                  {idx + 1}
                </span>
                <span className="flex-1 font-medium">{name}</span>
                <span className="font-bold text-primary">{stats.quantity}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <ActivityLogList logs={activityLogs} />
    </div>
  );
}
