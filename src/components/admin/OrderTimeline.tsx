import { useState, useMemo } from 'react';
import { OrderWithItems } from '@/hooks/useSupabaseOrders';
import { formatTimeEnglish, toEnglishNumbers } from '@/lib/formatNumber';
import { 
  Clock, 
  CheckCircle, 
  XCircle,
  ChefHat,
  Truck,
  Package,
  Edit3,
  AlertTriangle,
  Search
} from 'lucide-react';
import { Input } from '@/components/ui/input';

interface OrderTimelineProps {
  orders: OrderWithItems[];
}

interface TimelineEvent {
  time: Date;
  label: string;
  icon: React.ReactNode;
  color: string;
  duration?: number; // Duration from previous event in minutes
  isDelayed?: boolean;
  isEdit?: boolean;
}

export function OrderTimeline({ orders }: OrderTimelineProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<OrderWithItems | null>(null);

  // Filter orders by search
  const filteredOrders = useMemo(() => {
    if (!searchQuery.trim()) return orders.slice(0, 50); // Limit to 50 most recent
    
    const query = searchQuery.toLowerCase();
    return orders.filter(o => 
      o.order_number.toString().includes(query) ||
      o.customer_name.toLowerCase().includes(query) ||
      o.customer_phone.includes(query)
    ).slice(0, 50);
  }, [orders, searchQuery]);

  // Generate timeline events for an order
  // نحسب الوقت بناءً على الطوابع الزمنية المتاحة ونقدّر الأوقات المفقودة
  const getTimelineEvents = (order: OrderWithItems): TimelineEvent[] => {
    const events: TimelineEvent[] = [];
    const createdTime = new Date(order.created_at);
    const updatedTime = new Date(order.updated_at);
    const deliveredTime = order.delivered_at ? new Date(order.delivered_at) : null;
    const cancelledTime = order.cancelled_at ? new Date(order.cancelled_at) : null;
    
    // الحدث الأول: إنشاء الطلب (إرسال للميدان)
    events.push({
      time: createdTime,
      label: 'إرسال الطلب للميدان',
      icon: <Package className="w-4 h-4" />,
      color: 'bg-muted-foreground'
    });

    // تعديل الطلب (إن وجد)
    if (order.is_edited && order.edited_at) {
      const editTime = new Date(order.edited_at);
      const prevTime = events[events.length - 1].time;
      const duration = Math.floor((editTime.getTime() - prevTime.getTime()) / 60000);
      
      events.push({
        time: editTime,
        label: 'تم تعديل الطلب',
        icon: <Edit3 className="w-4 h-4" />,
        color: 'bg-warning',
        duration: Math.max(0, duration),
        isEdit: true
      });
    }

    // حساب الوقت الكلي من البداية للنهاية
    let endTime: Date;
    if (deliveredTime) {
      endTime = deliveredTime;
    } else if (cancelledTime) {
      endTime = cancelledTime;
    } else {
      endTime = updatedTime;
    }
    
    const totalDuration = endTime.getTime() - createdTime.getTime();
    
    // تقدير أوقات المراحل بناءً على الحالة الحالية
    // نستخدم نسب تقريبية لكل مرحلة
    const statusOrder = ['pending', 'preparing', 'ready', 'delivering', 'delivered'];
    const currentStatusIndex = statusOrder.indexOf(order.status);
    
    if (order.status === 'cancelled') {
      // في حالة الإلغاء
      const prevTime = events[events.length - 1].time;
      const duration = Math.floor(((cancelledTime || updatedTime).getTime() - prevTime.getTime()) / 60000);
      
      events.push({
        time: cancelledTime || updatedTime,
        label: `ملغي${order.cancellation_reason ? ` - ${order.cancellation_reason}` : ''}`,
        icon: <XCircle className="w-4 h-4" />,
        color: 'bg-destructive',
        duration: Math.max(0, duration)
      });
    } else if (currentStatusIndex >= 1) {
      // قيد التجهيز - نحسب من وقت الإنشاء
      const prevTime = events[events.length - 1].time;
      
      if (currentStatusIndex === 1) {
        // لا يزال قيد التجهيز
        const duration = Math.floor((updatedTime.getTime() - prevTime.getTime()) / 60000);
        events.push({
          time: updatedTime,
          label: 'قيد التجهيز في الميدان',
          icon: <ChefHat className="w-4 h-4" />,
          color: 'bg-warning',
          duration: Math.max(0, duration),
          isDelayed: duration > 30
        });
      } else {
        // انتهى التجهيز - نقدّر الوقت بنسبة 40% من الوقت الكلي
        const preparingDuration = Math.floor(totalDuration * 0.4);
        const preparingEndTime = new Date(createdTime.getTime() + preparingDuration);
        const duration = Math.floor((preparingEndTime.getTime() - prevTime.getTime()) / 60000);
        
        events.push({
          time: preparingEndTime,
          label: 'قيد التجهيز في الميدان',
          icon: <ChefHat className="w-4 h-4" />,
          color: 'bg-warning',
          duration: Math.max(0, duration),
          isDelayed: duration > 30
        });
        
        if (currentStatusIndex >= 2) {
          // جاهز - نقدّر 20% من الوقت الكلي للانتظار
          const readyTime = currentStatusIndex === 2 
            ? updatedTime 
            : new Date(createdTime.getTime() + totalDuration * 0.6);
          const readyDuration = Math.floor((readyTime.getTime() - preparingEndTime.getTime()) / 60000);
          
          events.push({
            time: readyTime,
            label: 'جاهز للتوصيل',
            icon: <CheckCircle className="w-4 h-4" />,
            color: 'bg-success',
            duration: Math.max(0, readyDuration)
          });
          
          if (currentStatusIndex >= 3) {
            // قيد التوصيل
            const deliveringTime = currentStatusIndex === 3 
              ? updatedTime 
              : new Date(createdTime.getTime() + totalDuration * 0.7);
            const deliveringDuration = Math.floor((deliveringTime.getTime() - readyTime.getTime()) / 60000);
            
            events.push({
              time: deliveringTime,
              label: `قيد التوصيل${order.delivery_person_name ? ` - ${order.delivery_person_name}` : ''}`,
              icon: <Truck className="w-4 h-4" />,
              color: 'bg-primary',
              duration: Math.max(0, deliveringDuration)
            });
            
            if (currentStatusIndex >= 4 && deliveredTime) {
              // تم التوصيل
              const deliveredDuration = Math.floor((deliveredTime.getTime() - deliveringTime.getTime()) / 60000);
              
              events.push({
                time: deliveredTime,
                label: 'تم التوصيل',
                icon: <CheckCircle className="w-4 h-4" />,
                color: 'bg-success',
                duration: Math.max(0, deliveredDuration),
                isDelayed: deliveredDuration > 45
              });
            }
          }
        }
      }
    }

    return events;
  };

  // Calculate total duration for an order
  const getTotalDuration = (order: OrderWithItems): number => {
    const start = new Date(order.created_at).getTime();
    let end: number;
    
    if (order.delivered_at) {
      end = new Date(order.delivered_at).getTime();
    } else if (order.cancelled_at) {
      end = new Date(order.cancelled_at).getTime();
    } else {
      end = new Date(order.updated_at).getTime();
    }
    
    return Math.floor((end - start) / 60000);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return { label: 'قيد الانتظار', color: 'bg-muted text-muted-foreground' };
      case 'preparing': return { label: 'قيد التجهيز', color: 'bg-warning/10 text-warning' };
      case 'ready': return { label: 'جاهز', color: 'bg-success/10 text-success' };
      case 'delivering': return { label: 'قيد التوصيل', color: 'bg-primary/10 text-primary' };
      case 'delivered': return { label: 'مكتمل', color: 'bg-success/10 text-success' };
      case 'cancelled': return { label: 'ملغي', color: 'bg-destructive/10 text-destructive' };
      default: return { label: status, color: 'bg-muted text-muted-foreground' };
    }
  };

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="bg-card border border-border rounded-xl p-3 shadow-soft">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="ابحث برقم الطلب أو اسم الزبون..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-10"
          />
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-3">
        {filteredOrders.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-8 text-center shadow-soft">
            <Clock className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">لا توجد طلبات</p>
          </div>
        ) : (
          filteredOrders.map(order => (
            <div 
              key={order.id}
              className={`bg-card border rounded-xl shadow-soft overflow-hidden transition-all ${
                selectedOrder?.id === order.id 
                  ? 'border-primary ring-2 ring-primary/20' 
                  : 'border-border hover:border-muted-foreground/30'
              }`}
            >
              {/* Order Header */}
              <div 
                className="p-4 cursor-pointer"
                onClick={() => setSelectedOrder(selectedOrder?.id === order.id ? null : order)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-primary">
                      #{toEnglishNumbers(order.order_number)}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${getStatusBadge(order.status).color}`}>
                      {getStatusBadge(order.status).label}
                    </span>
                    {order.is_edited && (
                      <span className="px-2 py-0.5 rounded-full text-xs bg-warning/10 text-warning flex items-center gap-1">
                        <Edit3 className="w-3 h-3" />
                        معدّل
                      </span>
                    )}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {toEnglishNumbers(getTotalDuration(order))} دقيقة
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{order.customer_name}</span>
                  <span>{formatTimeEnglish(order.created_at)}</span>
                </div>
              </div>

              {/* Timeline (expanded) */}
              {selectedOrder?.id === order.id && (
                <div className="border-t border-border p-4 bg-muted/30">
                  <div className="relative">
                    {getTimelineEvents(order).map((event, idx, arr) => (
                      <div key={idx} className="flex gap-3 mb-4 last:mb-0">
                        {/* Timeline Line */}
                        <div className="flex flex-col items-center">
                          <div className={`w-8 h-8 rounded-full ${event.color} flex items-center justify-center text-white`}>
                            {event.icon}
                          </div>
                          {idx < arr.length - 1 && (
                            <div className="w-0.5 flex-1 bg-border my-1" />
                          )}
                        </div>

                        {/* Event Content */}
                        <div className="flex-1 pb-4">
                          <div className="flex items-center justify-between">
                            <p className={`font-medium text-sm ${
                              event.isEdit ? 'text-warning' : 
                              event.isDelayed ? 'text-destructive' : 'text-foreground'
                            }`}>
                              {event.label}
                              {event.isDelayed && (
                                <AlertTriangle className="w-3 h-3 inline mr-1 text-destructive" />
                              )}
                            </p>
                            <span className="text-xs text-muted-foreground">
                              {formatTimeEnglish(event.time.toISOString())}
                            </span>
                          </div>
                          {event.duration !== undefined && event.duration > 0 && (
                            <p className={`text-xs mt-1 ${
                              event.isDelayed ? 'text-destructive' : 'text-muted-foreground'
                            }`}>
                              المدة: {toEnglishNumbers(event.duration)} دقيقة
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Order Items Summary */}
                  <div className="mt-4 pt-4 border-t border-border">
                    <p className="text-xs text-muted-foreground mb-2">الأصناف:</p>
                    <div className="flex flex-wrap gap-1">
                      {order.items.map((item, idx) => (
                        <span 
                          key={idx}
                          className="px-2 py-1 bg-card rounded text-xs"
                        >
                          {item.menu_item_name} × {toEnglishNumbers(item.quantity)}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
