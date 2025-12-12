import { useMemo } from 'react';
import { Truck, Star, Clock, AlertTriangle, CheckCircle, XCircle, User } from 'lucide-react';
import { useDeliveryDrivers } from '@/hooks/useDeliveryDrivers';

interface OrderData {
  delivery_person_id?: string | null;
  status: string;
  created_at: string;
  delivered_at?: string | null;
}

interface DriverStats {
  id: string;
  name: string;
  totalDeliveries: number;
  avgDeliveryTime: number;
  fastestDelivery: number;
  slowestDelivery: number;
  cancelledOrders: number;
  rating: number;
  performance: 'excellent' | 'good' | 'poor';
}

interface DriverPerformanceProps {
  orders: OrderData[];
}

export function DriverPerformance({ orders }: DriverPerformanceProps) {
  const { drivers, loading } = useDeliveryDrivers();

  const driverStats = useMemo(() => {
    // Create stats for all registered drivers
    const stats: Record<string, {
      name: string;
      deliveries: number;
      totalTime: number;
      fastest: number;
      slowest: number;
      cancelled: number;
    }> = {};

    // Initialize stats for all registered drivers
    drivers.forEach(driver => {
      stats[driver.user_id] = {
        name: driver.full_name,
        deliveries: 0,
        totalTime: 0,
        fastest: Infinity,
        slowest: 0,
        cancelled: 0,
      };
    });

    // Calculate stats from orders
    orders.forEach(order => {
      if (order.delivery_person_id && stats[order.delivery_person_id]) {
        const id = order.delivery_person_id;

        if (order.status === 'delivered' && order.delivered_at) {
          stats[id].deliveries++;
          // Calculate actual delivery time in minutes
          const createdAt = new Date(order.created_at).getTime();
          const deliveredAt = new Date(order.delivered_at).getTime();
          const deliveryTime = Math.round((deliveredAt - createdAt) / 60000); // minutes
          
          if (deliveryTime > 0 && deliveryTime < 180) { // reasonable range: 0-3 hours
            stats[id].totalTime += deliveryTime;
            stats[id].fastest = Math.min(stats[id].fastest, deliveryTime);
            stats[id].slowest = Math.max(stats[id].slowest, deliveryTime);
          }
        } else if (order.status === 'cancelled') {
          stats[id].cancelled++;
        }
      }
    });

    return Object.entries(stats).map(([id, data]): DriverStats => {
      const avgTime = data.deliveries > 0 ? data.totalTime / data.deliveries : 0;
      
      // Calculate rating based on performance metrics
      let speedScore = 3;
      if (avgTime > 0) {
        speedScore = avgTime <= 25 ? 5 : avgTime <= 35 ? 4 : avgTime <= 45 ? 3 : 2;
      }
      const deliveryScore = Math.min(5, data.deliveries / 3);
      const cancelScore = 5 - Math.min(5, data.cancelled);
      const rating = Math.round(((speedScore + deliveryScore + cancelScore) / 3) * 10) / 10;

      return {
        id,
        name: data.name,
        totalDeliveries: data.deliveries,
        avgDeliveryTime: Math.round(avgTime),
        fastestDelivery: data.fastest === Infinity ? 0 : data.fastest,
        slowestDelivery: data.slowest,
        cancelledOrders: data.cancelled,
        rating: data.deliveries > 0 ? rating : 0,
        performance: data.deliveries === 0 ? 'good' : rating >= 4 ? 'excellent' : rating >= 3 ? 'good' : 'poor',
      };
    }).sort((a, b) => b.totalDeliveries - a.totalDeliveries || b.rating - a.rating);
  }, [orders, drivers]);

  const getPerformanceColor = (performance: string) => {
    switch (performance) {
      case 'excellent': return 'text-success bg-success/10 border-success/30';
      case 'good': return 'text-warning bg-warning/10 border-warning/30';
      case 'poor': return 'text-destructive bg-destructive/10 border-destructive/30';
      default: return 'text-muted-foreground bg-muted';
    }
  };

  const getPerformanceLabel = (performance: string) => {
    switch (performance) {
      case 'excellent': return 'ممتاز';
      case 'good': return 'جيد';
      case 'poor': return 'ضعيف';
      default: return '-';
    }
  };

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-xl p-4 shadow-soft">
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <Truck className="w-5 h-5 text-primary" />
          أداء السائقين
        </h3>
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-3 sm:p-4 shadow-soft">
      <h3 className="font-bold mb-4 flex items-center gap-2 text-sm sm:text-base">
        <Truck className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
        أداء السائقين
      </h3>

      {driverStats.length === 0 ? (
        <div className="text-center py-6 sm:py-8 text-muted-foreground">
          <User className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm">لا يوجد سائقين مضافين</p>
          <p className="text-xs mt-1">أضف دلفري من إدارة المستخدمين</p>
        </div>
      ) : (
        <div className="space-y-2 sm:space-y-3">
          {driverStats.map((driver, idx) => (
            <div 
              key={driver.id} 
              className="border border-border rounded-lg p-2 sm:p-3 hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center justify-between mb-2 gap-2">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <span className="w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center bg-primary/10 text-primary rounded-full font-bold text-xs sm:text-sm flex-shrink-0">
                    {idx + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm sm:text-base truncate">{driver.name}</p>
                    {driver.totalDeliveries > 0 && (
                      <div className="flex items-center gap-1 text-xs sm:text-sm text-muted-foreground">
                        <Star className="w-3 h-3 text-warning fill-warning" />
                        <span>{driver.rating.toFixed(1)}</span>
                      </div>
                    )}
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium border flex-shrink-0 ${getPerformanceColor(driver.performance)}`}>
                  {getPerformanceLabel(driver.performance)}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2 text-[10px] sm:text-sm">
                <div className="flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-success flex-shrink-0" />
                  <span className="truncate">{driver.totalDeliveries} تسليم</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-info flex-shrink-0" />
                  <span className="truncate">
                    {driver.avgDeliveryTime > 0 ? `${driver.avgDeliveryTime} دقيقة` : '-'}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 sm:w-4 sm:h-4 text-warning flex-shrink-0" />
                  <span className="truncate">
                    {driver.fastestDelivery > 0 ? `أسرع ${driver.fastestDelivery} د` : '-'}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <XCircle className="w-3 h-3 sm:w-4 sm:h-4 text-destructive flex-shrink-0" />
                  <span className="truncate">{driver.cancelledOrders} إلغاء</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
