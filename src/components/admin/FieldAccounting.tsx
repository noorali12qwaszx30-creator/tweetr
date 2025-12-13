import { useState } from 'react';
import { useSupabaseOrders } from '@/hooks/useSupabaseOrders';
import { useDeliveryDrivers } from '@/hooks/useDeliveryDrivers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Truck, CheckCircle, XCircle, DollarSign, ChevronDown, ChevronUp, User } from 'lucide-react';

export function FieldAccounting() {
  const { orders } = useSupabaseOrders();
  const { drivers } = useDeliveryDrivers();
  const [expandedDriver, setExpandedDriver] = useState<string | null>(null);

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

  // Sort by delivered count (descending)
  const sortedDrivers = driverStats.sort((a, b) => b.deliveredCount - a.deliveredCount);

  const totalDelivered = deliveredOrders.length;
  const totalCancelled = cancelledOrders.filter(o => o.delivery_person_id).length;
  const totalRevenue = deliveredOrders.reduce((sum, o) => sum + Number(o.total_price), 0);

  const toggleDriver = (driverId: string) => {
    setExpandedDriver(prev => prev === driverId ? null : driverId);
  };

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

      {/* Driver Stats - Clickable List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Truck className="w-5 h-5 text-primary" />
            موظفي التوصيل
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {sortedDrivers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Truck className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p>لا توجد بيانات لموظفي التوصيل</p>
            </div>
          ) : (
            sortedDrivers.map((driver, index) => (
              <div key={driver.id} className="overflow-hidden rounded-lg border border-border">
                {/* Driver Name - Clickable Header */}
                <button
                  onClick={() => toggleDriver(driver.id)}
                  className="w-full flex items-center justify-between p-3 bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 flex items-center justify-center bg-primary/10 text-primary rounded-lg font-bold text-sm">
                      {index + 1}
                    </span>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{driver.name}</span>
                    </div>
                    {expandedDriver === driver.id ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-success font-bold">{driver.deliveredCount}</span>
                    <span className="text-xs text-muted-foreground">طلب</span>
                  </div>
                </button>
                
                {/* Driver Details - Expandable */}
                {expandedDriver === driver.id && (
                  <div className="p-4 bg-muted/10 border-t border-border space-y-3">
                    {/* Delivered Orders */}
                    <div className="flex items-center justify-between p-3 bg-success/10 rounded-lg border border-success/30">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-success" />
                        <span className="text-sm">طلبات تم توصيلها</span>
                      </div>
                      <span className="text-xl font-bold text-success">{driver.deliveredCount}</span>
                    </div>
                    
                    {/* Cancelled Orders */}
                    <div className="flex items-center justify-between p-3 bg-destructive/10 rounded-lg border border-destructive/30">
                      <div className="flex items-center gap-2">
                        <XCircle className="w-5 h-5 text-destructive" />
                        <span className="text-sm">طلبات ملغية</span>
                      </div>
                      <span className="text-xl font-bold text-destructive">{driver.cancelledCount}</span>
                    </div>
                    
                    {/* Total Revenue (Accounting) */}
                    <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg border border-primary/30">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-primary" />
                        <span className="text-sm">مبلغ المحاسبة</span>
                      </div>
                      <div className="text-left">
                        <span className="text-xl font-bold text-primary">{driver.totalRevenue.toLocaleString()}</span>
                        <span className="text-xs text-muted-foreground mr-1">د.ع</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
