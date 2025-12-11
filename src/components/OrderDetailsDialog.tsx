import { Order, ORDER_STATUS_LABELS } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  User, 
  Phone, 
  MapPin, 
  Clock, 
  Truck, 
  MessageSquare,
  Receipt,
  Calendar,
  XCircle,
  CheckCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface OrderDetailsDialogProps {
  order: Order | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OrderDetailsDialog({ order, open, onOpenChange }: OrderDetailsDialogProps) {
  if (!order) return null;

  const statusColors: Record<string, string> = {
    pending: 'bg-warning/10 text-warning border-warning/30',
    preparing: 'bg-info/10 text-info border-info/30',
    ready: 'bg-success/10 text-success border-success/30',
    delivering: 'bg-secondary/10 text-secondary border-secondary/30',
    delivered: 'bg-success/10 text-success border-success/30',
    cancelled: 'bg-destructive/10 text-destructive border-destructive/30',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Receipt className="w-5 h-5 text-primary" />
            تفاصيل الطلب #{order.orderNumber}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Status & Type */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`px-3 py-1 rounded-full text-sm font-medium border ${statusColors[order.status]}`}>
              {order.status === 'delivered' && <CheckCircle className="w-4 h-4 inline ml-1" />}
              {order.status === 'cancelled' && <XCircle className="w-4 h-4 inline ml-1" />}
              {ORDER_STATUS_LABELS[order.status]}
            </span>
            {order.type === 'takeaway' && (
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-warning/20 text-warning">
                سفري
              </span>
            )}
            {order.type === 'delivery' && (
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-info/20 text-info">
                توصيل
              </span>
            )}
          </div>

          {/* Timestamps */}
          <div className="bg-muted/50 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">تاريخ الطلب:</span>
              <span className="font-medium">
                {format(new Date(order.createdAt), 'yyyy/MM/dd', { locale: ar })}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">وقت الطلب:</span>
              <span className="font-medium">
                {format(new Date(order.createdAt), 'hh:mm a', { locale: ar })}
              </span>
            </div>
          </div>

          {/* Customer Info */}
          <div className="bg-card border border-border rounded-lg p-3 space-y-2">
            <h3 className="font-semibold text-sm text-muted-foreground mb-2">بيانات الزبون</h3>
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-primary" />
              <span>{order.customer.name}</span>
            </div>
            {order.customer.phone && (
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-primary" />
                <span dir="ltr">{order.customer.phone}</span>
              </div>
            )}
            {order.customer.address && (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                <span>{order.customer.address}</span>
              </div>
            )}
          </div>

          {/* Order Items */}
          <div className="bg-card border border-border rounded-lg p-3">
            <h3 className="font-semibold text-sm text-muted-foreground mb-3">عناصر الطلب</h3>
            <div className="space-y-2">
              {order.items.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 flex items-center justify-center bg-primary/10 text-primary rounded-md text-sm font-bold">
                      {item.quantity}
                    </span>
                    <div>
                      <span className="font-medium">{item.menuItem.name}</span>
                      <p className="text-xs text-muted-foreground">{item.menuItem.category}</p>
                    </div>
                  </div>
                  <div className="text-left">
                    <p className="font-medium">{(item.menuItem.price * item.quantity).toLocaleString()} د.ع</p>
                    <p className="text-xs text-muted-foreground">{item.menuItem.price.toLocaleString()} × {item.quantity}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between pt-3 mt-3 border-t-2 border-primary/20">
              <span className="font-bold">المجموع الكلي</span>
              <span className="font-bold text-lg text-primary">{order.totalPrice.toLocaleString()} د.ع</span>
            </div>
          </div>

          {/* Cashier */}
          <div className="flex items-center gap-2 text-sm bg-muted/50 rounded-lg p-3">
            <User className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">الكاشير:</span>
            <span className="font-medium">{order.cashierName}</span>
          </div>

          {/* Delivery Person */}
          {order.deliveryPersonName && (
            <div className="flex items-center gap-2 text-sm bg-info/10 rounded-lg p-3">
              <Truck className="w-4 h-4 text-info" />
              <span className="text-info">الدلفري:</span>
              <span className="font-medium text-info">{order.deliveryPersonName}</span>
            </div>
          )}

          {/* Notes */}
          {order.notes && (
            <div className="bg-warning/10 border border-warning/30 rounded-lg p-3">
              <div className="flex items-center gap-2 text-warning mb-1">
                <MessageSquare className="w-4 h-4" />
                <span className="font-semibold text-sm">ملاحظات</span>
              </div>
              <p className="text-sm">{order.notes}</p>
            </div>
          )}

          {/* Cancellation Reason */}
          {order.status === 'cancelled' && order.cancellationReason && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3">
              <div className="flex items-center gap-2 text-destructive mb-1">
                <XCircle className="w-4 h-4" />
                <span className="font-semibold text-sm">سبب الإلغاء</span>
              </div>
              <p className="text-sm">{order.cancellationReason}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
