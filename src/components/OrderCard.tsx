import { Order, ORDER_STATUS_LABELS } from '@/types';
import { OrderTimer } from './OrderTimer';
import { Button } from '@/components/ui/button';
import { MessageSquare, Phone, Edit, X, CheckCircle, Truck } from 'lucide-react';

interface OrderCardProps {
  order: Order;
  showCustomerInfo?: boolean;
  showItems?: boolean;
  showActions?: boolean;
  actions?: React.ReactNode;
  compact?: boolean;
}

export function OrderCard({
  order,
  showCustomerInfo = true,
  showItems = true,
  showActions = true,
  actions,
  compact = false,
}: OrderCardProps) {
  const hasNotes = !!order.notes || order.items.some(item => !!item.notes);

  const statusColors: Record<string, string> = {
    pending: 'bg-warning/10 text-warning border-warning/30',
    preparing: 'bg-info/10 text-info border-info/30',
    ready: 'bg-success/10 text-success border-success/30',
    delivering: 'bg-secondary/10 text-secondary border-secondary/30',
    delivered: 'bg-muted text-muted-foreground border-border',
    cancelled: 'bg-destructive/10 text-destructive border-destructive/30',
  };

  return (
    <div
      className={`
        bg-card rounded-xl border shadow-soft p-4 transition-all duration-200
        ${order.type === 'takeaway' ? 'border-warning/50 bg-warning/5' : 'border-border'}
        ${hasNotes ? 'animate-shake-flip' : ''}
        ${compact ? 'p-3' : 'p-4'}
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl font-bold text-primary">#{order.orderNumber}</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${statusColors[order.status]}`}>
            {ORDER_STATUS_LABELS[order.status]}
          </span>
          {order.type === 'takeaway' && (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-warning/20 text-warning">
              سفري
            </span>
          )}
        </div>
        <OrderTimer startTime={order.createdAt} />
      </div>

      {/* Customer Info */}
      {showCustomerInfo && (
        <div className="mb-3 p-3 bg-muted/50 rounded-lg">
          <p className="font-semibold text-foreground">{order.customer.name}</p>
          {order.customer.phone && (
            <p className="text-sm text-muted-foreground">{order.customer.phone}</p>
          )}
          {order.customer.address && (
            <p className="text-sm text-muted-foreground">{order.customer.address}</p>
          )}
        </div>
      )}

      {/* Items */}
      {showItems && (
        <div className="space-y-2 mb-3">
          {order.items.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 flex items-center justify-center bg-primary/10 text-primary rounded-md text-xs font-bold">
                  {item.quantity}
                </span>
                <span className="text-foreground">{item.menuItem.name}</span>
                {item.notes && (
                  <MessageSquare className="w-3.5 h-3.5 text-warning" />
                )}
              </div>
              <span className="text-muted-foreground">{(item.menuItem.price * item.quantity).toLocaleString()} د.ع</span>
            </div>
          ))}
          <div className="flex items-center justify-between pt-2 border-t border-border font-semibold">
            <span>المجموع</span>
            <span className="text-primary">{order.totalPrice.toLocaleString()} د.ع</span>
          </div>
        </div>
      )}

      {/* Notes */}
      {order.notes && (
        <div className="mb-3 p-2 bg-warning/10 border border-warning/30 rounded-lg">
          <p className="text-sm text-warning flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            {order.notes}
          </p>
        </div>
      )}

      {/* Delivery Person */}
      {order.deliveryPersonName && (
        <div className="mb-3 p-2 bg-info/10 border border-info/30 rounded-lg">
          <p className="text-sm text-info flex items-center gap-2">
            <Truck className="w-4 h-4" />
            الدلفري: {order.deliveryPersonName}
          </p>
        </div>
      )}

      {/* Actions */}
      {showActions && actions && (
        <div className="flex gap-2 flex-wrap">
          {actions}
        </div>
      )}
    </div>
  );
}
