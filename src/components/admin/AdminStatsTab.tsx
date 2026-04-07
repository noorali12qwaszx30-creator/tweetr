import { OrderWithItems } from '@/hooks/useSupabaseOrders';
import { DeliveryAreaAnalytics } from './DeliveryAreaAnalytics';
import { CustomerAnalytics } from './CustomerAnalytics';
import { FinanceBreakdown } from './FinanceBreakdown';
import { formatNumberWithCommas, toEnglishNumbers } from '@/lib/formatNumber';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface AdminStatsTabProps {
  orders: OrderWithItems[];
}

export function AdminStatsTab({ orders }: AdminStatsTabProps) {
  const completedOrders = orders.filter(o => o.status === 'delivered');

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

  // Chart-compatible orders for CustomerAnalytics & FinanceBreakdown
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
      <Tabs defaultValue="items">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="items" className="text-xs px-1">المبيعات</TabsTrigger>
          <TabsTrigger value="areas" className="text-xs px-1">المناطق</TabsTrigger>
          <TabsTrigger value="customers" className="text-xs px-1">الزبائن</TabsTrigger>
          <TabsTrigger value="finance" className="text-xs px-1">المالية</TabsTrigger>
        </TabsList>

        <TabsContent value="items" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-card border border-border rounded-xl p-3 shadow-soft">
              <p className="text-muted-foreground text-xs">إجمالي المباع</p>
              <p className="text-2xl font-bold text-primary">
                {toEnglishNumbers(sortedItems.reduce((sum, [, s]) => sum + s.quantity, 0))}
              </p>
            </div>
            <div className="bg-card border border-border rounded-xl p-3 shadow-soft">
              <p className="text-muted-foreground text-xs">إجمالي الإيرادات</p>
              <p className="text-2xl font-bold text-success">
                {formatNumberWithCommas(sortedItems.reduce((sum, [, s]) => sum + s.revenue, 0))}
              </p>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-4 shadow-soft">
            <h3 className="font-bold mb-3 text-success">الأكثر مبيعاً</h3>
            <div className="space-y-2">
              {sortedItems.slice(0, 5).map(([name, stats], idx) => (
                <div key={name} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 flex items-center justify-center bg-success/10 text-success rounded font-bold text-xs">
                      {toEnglishNumbers(idx + 1)}
                    </span>
                    <span className="font-medium text-sm">{name}</span>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold">{toEnglishNumbers(stats.quantity)}</p>
                    <p className="text-xs text-muted-foreground">{formatNumberWithCommas(stats.revenue)} د.ع</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-4 shadow-soft">
            <h3 className="font-bold mb-3 text-destructive">الأقل مبيعاً</h3>
            <div className="space-y-2">
              {sortedItems.slice(-3).reverse().map(([name, stats], idx) => (
                <div key={name} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 flex items-center justify-center bg-destructive/10 text-destructive rounded font-bold text-xs">
                      {toEnglishNumbers(sortedItems.length - idx)}
                    </span>
                    <span className="font-medium text-sm">{name}</span>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold">{toEnglishNumbers(stats.quantity)}</p>
                    <p className="text-xs text-muted-foreground">{formatNumberWithCommas(stats.revenue)} د.ع</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="areas" className="mt-4">
          <DeliveryAreaAnalytics orders={orders} />
        </TabsContent>

        <TabsContent value="customers" className="mt-4">
          <CustomerAnalytics orders={ordersForCharts} />
        </TabsContent>

        <TabsContent value="finance" className="mt-4">
          <FinanceBreakdown orders={ordersForCharts} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
