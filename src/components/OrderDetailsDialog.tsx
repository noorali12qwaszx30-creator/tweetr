import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  User, 
  Phone, 
  MapPin, 
  Clock, 
  Truck, 
  Package,
  MessageSquare,
  CheckCircle,
  XCircle,
  Calendar
} from 'lucide-react';
import { OrderWithItems } from '@/hooks/useSupabaseOrders';

interface OrderDetailsDialogProps {
  order: OrderWithItems | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OrderDetailsDialog({ order, open, onOpenChange }: OrderDetailsDialogProps) {
  if (!order) return null;

  const isDelivered = order.status === 'delivered';
  const isCancelled = order.status === 'cancelled';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>طلب #{order.order_number}</span>
            <Badge 
              variant={isDelivered ? 'default' : 'destructive'}
              className={isDelivered ? 'bg-success text-success-foreground' : ''}
            >
              {isDelivered ? 'مكتمل' : 'ملغي'}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Customer Info */}
          <div className="bg-muted/50 rounded-lg p-3 space-y-2">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <User className="w-4 h-4 text-primary" />
              بيانات الزبون
            </h3>
            <div className="text-sm space-y-1 mr-6">
              <p className="flex items-center gap-2">
                <User className="w-3 h-3 text-muted-foreground" />
                {order.customer_name}
              </p>
              <p className="flex items-center gap-2">
                <Phone className="w-3 h-3 text-muted-foreground" />
                {order.customer_phone}
              </p>
              {order.customer_address && (
                <p className="flex items-center gap-2">
                  <MapPin className="w-3 h-3 text-muted-foreground" />
                  {order.customer_address}
                </p>
              )}
            </div>
          </div>

          <Separator />

          {/* Order Items */}
          <div className="space-y-2">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Package className="w-4 h-4 text-primary" />
              محتويات الطلب
            </h3>
            <div className="space-y-2">
              {order.items.map((item, index) => (
                <div key={index} className="flex items-center justify-between bg-muted/30 rounded-lg p-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xs font-bold">
                      {item.quantity}
                    </span>
                    <span className="text-sm">{item.menu_item_name}</span>
                  </div>
                  <span className="text-sm font-semibold">
                    {(Number(item.menu_item_price) * item.quantity).toLocaleString()} د.ع
                  </span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <span className="font-bold">المجموع الكلي</span>
              <span className="font-bold text-primary text-lg">
                {Number(order.total_price).toLocaleString()} د.ع
              </span>
            </div>
          </div>

          {order.notes && (
            <>
              <Separator />
              <div className="bg-warning/10 border border-warning/20 rounded-lg p-3">
                <h3 className="font-semibold text-sm flex items-center gap-2 mb-1">
                  <MessageSquare className="w-4 h-4 text-warning" />
                  ملاحظات
                </h3>
                <p className="text-sm text-muted-foreground mr-6">{order.notes}</p>
              </div>
            </>
          )}

          <Separator />

          {/* Delivery Info */}
          <div className="space-y-2">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Truck className="w-4 h-4 text-primary" />
              تفاصيل التوصيل
            </h3>
            <div className="bg-muted/50 rounded-lg p-3 space-y-2 text-sm">
              {order.cashier_name && (
                <p className="flex items-center gap-2">
                  <User className="w-3 h-3 text-muted-foreground" />
                  <span className="text-muted-foreground">الكاشير:</span>
                  <span className="font-medium">{order.cashier_name}</span>
                </p>
              )}
              {order.delivery_person_name && (
                <p className="flex items-center gap-2">
                  <Truck className="w-3 h-3 text-muted-foreground" />
                  <span className="text-muted-foreground">الدلفري:</span>
                  <span className="font-medium">{order.delivery_person_name}</span>
                </p>
              )}
              <p className="flex items-center gap-2">
                <Calendar className="w-3 h-3 text-muted-foreground" />
                <span className="text-muted-foreground">تاريخ الإنشاء:</span>
                <span className="font-medium">{new Date(order.created_at).toLocaleString('ar-IQ')}</span>
              </p>
              {isDelivered && order.delivered_at && (
                <p className="flex items-center gap-2 text-success">
                  <CheckCircle className="w-3 h-3" />
                  <span>تم التوصيل:</span>
                  <span className="font-medium">{new Date(order.delivered_at).toLocaleString('ar-IQ')}</span>
                </p>
              )}
              {isCancelled && order.cancelled_at && (
                <p className="flex items-center gap-2 text-destructive">
                  <XCircle className="w-3 h-3" />
                  <span>تم الإلغاء:</span>
                  <span className="font-medium">{new Date(order.cancelled_at).toLocaleString('ar-IQ')}</span>
                </p>
              )}
            </div>
          </div>

          {/* Cancellation Reason */}
          {isCancelled && order.cancellation_reason && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
              <h3 className="font-semibold text-sm flex items-center gap-2 text-destructive mb-1">
                <XCircle className="w-4 h-4" />
                سبب الإلغاء
              </h3>
              <p className="text-sm mr-6">{order.cancellation_reason}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
