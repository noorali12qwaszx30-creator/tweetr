import { useSupabaseOrders } from '@/hooks/useSupabaseOrders';
import { useDeliveryDrivers } from '@/hooks/useDeliveryDrivers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Truck, CheckCircle, XCircle, DollarSign } from 'lucide-react';

export function FieldAccounting() {
  const { orders } = useSupabaseOrders();
  const { drivers } = useDeliveryDrivers();

  // Filter delivery orders
  const deliveryOrders = orders.filter(o => o.type === 'delivery');
  const deliveredOrders = deliveryOrders.filter(o => o.status === 'delivered');
  const cancelledOrders = deliveryOrders.filter(o => o.status === 'cancelled');

  // Calculate stats per driver
  const driverStats = drivers.map(driver => {
    const driverOrders = deliveredOrders.filter(o => o.delivery_person_id === driver.user_id);
    const driverCancelled = cancelledOrders.filter(o => o.delivery_person_id === driver.user_id);
    const totalRevenue = driverOrders.reduce((sum, o) => sum + Number(o.total_price), 0);
    
    return {
      id: driver.user_id,
      name: driver.full_name || driver.username,
      deliveredCount: driverOrders.length,
      cancelledCount: driverCancelled.length,
      totalRevenue,
    };
  });

  // Sort by delivered count
  const sortedDrivers = driverStats.sort((a, b) => b.deliveredCount - a.deliveredCount);

  const totalDelivered = deliveredOrders.length;
  const totalCancelled = cancelledOrders.filter(o => o.delivery_person_id).length;
  const totalRevenue = deliveredOrders.reduce((sum, o) => sum + Number(o.total_price), 0);

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-success/10 border-success/30">
          <CardContent className="p-4 text-center">
            <CheckCircle className="w-6 h-6 mx-auto mb-2 text-success" />
            <p className="text-2xl font-bold text-success">{totalDelivered}</p>
            <p className="text-xs text-muted-foreground">طلب تم توصيله</p>
          </CardContent>
        </Card>
        
        <Card className="bg-destructive/10 border-destructive/30">
          <CardContent className="p-4 text-center">
            <XCircle className="w-6 h-6 mx-auto mb-2 text-destructive" />
            <p className="text-2xl font-bold text-destructive">{totalCancelled}</p>
            <p className="text-xs text-muted-foreground">طلب ملغي</p>
          </CardContent>
        </Card>
        
        <Card className="bg-primary/10 border-primary/30">
          <CardContent className="p-4 text-center">
            <DollarSign className="w-6 h-6 mx-auto mb-2 text-primary" />
            <p className="text-lg font-bold text-primary">{totalRevenue.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">إجمالي المبيعات</p>
          </CardContent>
        </Card>
      </div>

      {/* Driver Stats */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Truck className="w-5 h-5 text-primary" />
            إحصائيات موظفي التوصيل
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {sortedDrivers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Truck className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p>لا توجد بيانات لموظفي التوصيل</p>
            </div>
          ) : (
            sortedDrivers.map((driver, index) => (
              <div key={driver.id} className="bg-muted/50 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 flex items-center justify-center bg-primary/10 text-primary rounded-lg font-bold text-sm">
                      {index + 1}
                    </span>
                    <span className="font-medium">{driver.name}</span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div className="text-center">
                    <span className="text-success font-bold">{driver.deliveredCount}</span>
                    <p className="text-xs text-muted-foreground">تم توصيل</p>
                  </div>
                  <div className="text-center">
                    <span className="text-destructive font-bold">{driver.cancelledCount}</span>
                    <p className="text-xs text-muted-foreground">ملغي</p>
                  </div>
                  <div className="text-center">
                    <span className="text-primary font-bold">{driver.totalRevenue.toLocaleString()}</span>
                    <p className="text-xs text-muted-foreground">د.ع</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
