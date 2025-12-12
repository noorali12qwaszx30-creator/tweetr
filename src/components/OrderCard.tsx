import { OrderTimer } from './OrderTimer';
import { MessageSquare, Truck, Pencil } from 'lucide-react';
import { OrderWithItems, DbOrderItem } from '@/hooks/useSupabaseOrders';

// Status labels in Arabic
const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: 'قيد الانتظار',
  preparing: 'قيد التجهيز',
  ready: 'جاهز',
  delivering: 'قيد التوصيل',
  delivered: 'تم التسليم',
  cancelled: 'ملغي',
};

interface OrderCardProps {
  order: OrderWithItems;
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
  const hasNotes = !!order.notes || order.items.some((item: DbOrderItem) => !!item.notes);

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
        bg-card rounded-xl border shadow-soft transition-all duration-200
        ${order.type === 'takeaway' ? 'border-warning/50 bg-warning/5' : 'border-border'}
        ${hasNotes ? 'order-has-notes' : ''}
        ${order.is_edited ? 'ring-2 ring-warning/50' : ''}
        ${compact ? 'p-2 sm:p-3' : 'p-3 sm:p-4'}
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2 sm:mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <span className="text-xl sm:text-2xl font-bold text-primary">#{order.order_number}</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium border ${statusColors[order.status]}`}>
            {ORDER_STATUS_LABELS[order.status]}
          </span>
          {order.type === 'takeaway' && (
            <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium bg-warning/20 text-warning">
              سفري
            </span>
          )}
          {order.is_edited && (
            <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium bg-info/20 text-info flex items-center gap-1">
              <Pencil className="w-3 h-3" />
              معدّل
            </span>
          )}
        </div>
        <OrderTimer startTime={new Date(order.created_at)} />
      </div>

      {/* Customer Info */}
      {showCustomerInfo && (
        <div className="mb-2 sm:mb-3 p-2 sm:p-3 bg-muted/50 rounded-lg">
          <p className="font-semibold text-foreground text-sm sm:text-base">{order.customer_name}</p>
          {order.customer_phone && (
            <p className="text-xs sm:text-sm text-muted-foreground">{order.customer_phone}</p>
          )}
          {order.customer_address && (
            <p className="text-xs sm:text-sm text-muted-foreground">{order.customer_address}</p>
          )}
        </div>
      )}

      {/* Items */}
      {showItems && (
        <div className="space-y-1.5 sm:space-y-2 mb-2 sm:mb-3">
          {order.items.map((item: DbOrderItem, idx: number) => (
            <div key={idx} className="flex items-center justify-between text-xs sm:text-sm">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center bg-primary/10 text-primary rounded-md text-[10px] sm:text-xs font-bold">
                  {item.quantity}
                </span>
                <span className="text-foreground truncate max-w-[120px] sm:max-w-none">{item.menu_item_name}</span>
                {item.notes && (
                  <MessageSquare className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-warning flex-shrink-0" />
                )}
              </div>
              <span className="text-muted-foreground text-[10px] sm:text-xs">
                {(Number(item.menu_item_price) * item.quantity).toLocaleString()} د.ع
              </span>
            </div>
          ))}
          <div className="flex items-center justify-between pt-2 border-t border-border font-semibold text-sm sm:text-base">
            <span>المجموع</span>
            <span className="text-primary">{Number(order.total_price).toLocaleString()} د.ع</span>
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
      {order.delivery_person_name && (
        <div className="mb-3 p-2 bg-info/10 border border-info/30 rounded-lg">
          <p className="text-sm text-info flex items-center gap-2">
            <Truck className="w-4 h-4" />
            موظف التوصيل: {order.delivery_person_name}
          </p>
        </div>
      )}

      {/* Cancellation Reason */}
      {order.cancellation_reason && (
        <div className="mb-3 p-2 bg-destructive/10 border border-destructive/30 rounded-lg">
          <p className="text-sm text-destructive">
            سبب الإلغاء: {order.cancellation_reason}
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
