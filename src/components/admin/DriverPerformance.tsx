import { useMemo } from 'react';
import { Order } from '@/types';
import { Truck, Star, Clock, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

interface DriverStats {
  id: string;
  name: string;
  totalDeliveries: number;
  avgDeliveryTime: number;
  fastestDelivery: number;
  slowestDelivery: number;
  cancelledOrders: number;
  rating: number; // calculated rating
  performance: 'excellent' | 'good' | 'poor';
}

interface DriverPerformanceProps {
  orders: Order[];
}

export function DriverPerformance({ orders }: DriverPerformanceProps) {
  const driverStats = useMemo(() => {
    const stats: Record<string, {
      name: string;
      deliveries: number;
      totalTime: number;
      fastest: number;
      slowest: number;
      cancelled: number;
    }> = {};

    orders.forEach(order => {
      if (order.deliveryPersonId && order.deliveryPersonName) {
        const id = order.deliveryPersonId;
        if (!stats[id]) {
          stats[id] = {
            name: order.deliveryPersonName,
            deliveries: 0,
            totalTime: 0,
            fastest: Infinity,
            slowest: 0,
            cancelled: 0,
          };
        }

        if (order.status === 'delivered') {
          stats[id].deliveries++;
          // Simulate delivery time (in real app, this would come from actual timestamps)
          const deliveryTime = Math.floor(Math.random() * 30) + 15; // 15-45 min
          stats[id].totalTime += deliveryTime;
          stats[id].fastest = Math.min(stats[id].fastest, deliveryTime);
          stats[id].slowest = Math.max(stats[id].slowest, deliveryTime);
        } else if (order.status === 'cancelled') {
          stats[id].cancelled++;
        }
      }
    });

    return Object.entries(stats).map(([id, data]): DriverStats => {
      const avgTime = data.deliveries > 0 ? data.totalTime / data.deliveries : 0;
      
      // Calculate rating based on performance metrics
      const speedScore = avgTime <= 25 ? 5 : avgTime <= 35 ? 4 : avgTime <= 45 ? 3 : 2;
      const deliveryScore = Math.min(5, data.deliveries / 5);
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
        rating,
        performance: rating >= 4 ? 'excellent' : rating >= 3 ? 'good' : 'poor',
      };
    }).sort((a, b) => b.rating - a.rating);
  }, [orders]);

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

  return (
    <div className="bg-card border border-border rounded-xl p-4 shadow-soft">
      <h3 className="font-bold mb-4 flex items-center gap-2">
        <Truck className="w-5 h-5 text-primary" />
        أداء السائقين
      </h3>

      {driverStats.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Truck className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>لا يوجد سائقين بعد</p>
        </div>
      ) : (
        <div className="space-y-3">
          {driverStats.map((driver, idx) => (
            <div 
              key={driver.id} 
              className="border border-border rounded-lg p-3 hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 flex items-center justify-center bg-primary/10 text-primary rounded-full font-bold">
                    {idx + 1}
                  </span>
                  <div>
                    <p className="font-semibold">{driver.name}</p>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Star className="w-3 h-3 text-warning fill-warning" />
                      <span>{driver.rating.toFixed(1)}</span>
                    </div>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getPerformanceColor(driver.performance)}`}>
                  {getPerformanceLabel(driver.performance)}
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                <div className="flex items-center gap-1">
                  <CheckCircle className="w-4 h-4 text-success" />
                  <span>{driver.totalDeliveries} تسليم</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4 text-info" />
                  <span>معدل {driver.avgDeliveryTime} دقيقة</span>
                </div>
                <div className="flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4 text-warning" />
                  <span>أسرع {driver.fastestDelivery} د</span>
                </div>
                <div className="flex items-center gap-1">
                  <XCircle className="w-4 h-4 text-destructive" />
                  <span>{driver.cancelledOrders} إلغاء</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
