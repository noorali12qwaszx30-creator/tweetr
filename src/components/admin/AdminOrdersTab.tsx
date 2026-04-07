import { OrderWithItems } from '@/hooks/useSupabaseOrders';
import { formatNumberWithCommas, formatTimeEnglish, toEnglishNumbers } from '@/lib/formatNumber';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, XCircle } from 'lucide-react';

interface AdminOrdersTabProps {
  orders: OrderWithItems[];
  onOrderClick: (order: OrderWithItems) => void;
}

export function AdminOrdersTab({ orders, onOrderClick }: AdminOrdersTabProps) {
  const completedOrders = orders.filter(o => o.status === 'delivered');
  const cancelledOrders = orders.filter(o => o.status === 'cancelled');
  const totalRevenue = completedOrders.reduce((sum, o) => sum + (Number(o.total_price) - Number(o.delivery_fee || 0)), 0);

  const cancellationReasonStats: Record<string, number> = {};
  cancelledOrders.forEach(order => {
    const reason = order.cancellation_reason || 'بدون سبب';
    cancellationReasonStats[reason] = (cancellationReasonStats[reason] || 0) + 1;
  });

  return (
    <div className="space-y-4">
      <Tabs defaultValue="completed">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="completed" className="gap-2">
            <CheckCircle className="w-4 h-4" />
            المكتملة ({completedOrders.length})
          </TabsTrigger>
          <TabsTrigger value="cancelled" className="gap-2">
            <XCircle className="w-4 h-4" />
            الملغية ({cancelledOrders.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="completed" className="space-y-3 mt-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">إجمالي الإيرادات</span>
            <span className="font-bold text-success">{formatNumberWithCommas(totalRevenue)} د.ع</span>
          </div>
          {completedOrders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>لا توجد طلبات مكتملة</p>
            </div>
          ) : (
            completedOrders.map(order => (
              <div key={order.id} className="bg-card border border-success/30 rounded-xl p-4 shadow-soft cursor-pointer hover:shadow-elevated transition-shadow" onClick={() => onOrderClick(order)}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-primary">#{toEnglishNumbers(order.order_number)}</span>
                    <span className="px-2 py-0.5 rounded-full text-xs bg-success/10 text-success">مكتمل</span>
                  </div>
                  <span className="font-bold text-success">{formatNumberWithCommas(Number(order.total_price))} د.ع</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {order.customer_name} • {formatTimeEnglish(order.created_at)}
                </div>
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="cancelled" className="space-y-3 mt-4">
          {Object.keys(cancellationReasonStats).length > 0 && (
            <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-3">
              <p className="text-sm font-medium text-destructive mb-2">ملخص الأسباب</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(cancellationReasonStats).map(([reason, count]) => (
                  <span key={reason} className="px-2 py-1 bg-card rounded-lg text-xs">
                    {reason}: <strong>{toEnglishNumbers(count)}</strong>
                  </span>
                ))}
              </div>
            </div>
          )}
          {cancelledOrders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <XCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>لا توجد طلبات ملغية</p>
            </div>
          ) : (
            cancelledOrders.map(order => (
              <div key={order.id} className="bg-card border border-destructive/30 rounded-xl p-4 shadow-soft cursor-pointer hover:shadow-elevated transition-shadow" onClick={() => onOrderClick(order)}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-primary">#{toEnglishNumbers(order.order_number)}</span>
                    <span className="px-2 py-0.5 rounded-full text-xs bg-destructive/10 text-destructive">ملغي</span>
                  </div>
                  <span className="font-bold text-destructive">{formatNumberWithCommas(Number(order.total_price))} د.ع</span>
                </div>
                {order.cancellation_reason && <p className="text-sm text-destructive mb-1">السبب: {order.cancellation_reason}</p>}
                <div className="text-sm text-muted-foreground">
                  {order.customer_name} • {formatTimeEnglish(order.created_at)}
                </div>
              </div>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
