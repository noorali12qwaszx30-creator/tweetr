import { OrderTimer } from './OrderTimer';
import { MessageSquare, Truck, Pencil, AlertTriangle } from 'lucide-react';
import { OrderWithItems, DbOrderItem } from '@/hooks/useSupabaseOrders';
import { toEnglishNumbers, formatNumberWithCommas } from '@/lib/formatNumber';
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, ORDER_SOURCE_LABELS } from '@/types';

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

  const statusColors = ORDER_STATUS_COLORS;

  return (
    <div
      className={`
        bg-card rounded-3xl border shadow-card hover:shadow-elevated transition-all duration-300
        ${order.type === 'takeaway' ? 'border-warning/40' : ''}
        ${order.type === 'pickup' ? 'border-accent/40' : ''}
        ${order.type === 'delivery' ? 'border-border/50' : ''}
        ${hasNotes ? 'order-has-notes' : ''}
        ${order.is_edited ? 'ring-2 ring-warning/40' : ''}
        ${order.has_issue ? 'ring-2 ring-destructive/40 border-destructive/40' : ''}
        ${compact ? 'p-3 sm:p-3.5' : 'p-4 sm:p-5'}
      `}
    >
      {/* Issue Alert Banner */}
      {order.has_issue && (
        <div className="mb-3 p-3 bg-destructive/10 border border-destructive/30 rounded-2xl">
          <div className="flex items-center gap-2 text-destructive font-medium text-sm">
            <AlertTriangle className="w-4 h-4" />
            <span>بلاغ: {order.issue_reason}</span>
          </div>
          {order.issue_reported_by && (
            <p className="text-xs text-destructive/80 mt-1">
              من: {order.issue_reported_by}
            </p>
          )}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-2 sm:mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <span className="text-lg sm:text-xl font-bold text-primary-foreground bg-primary px-3 py-1 rounded-full shadow-button">#{toEnglishNumbers(order.order_number)}</span>
          <span className={`px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-semibold ${statusColors[order.status]}`}>
            {ORDER_STATUS_LABELS[order.status]}
          </span>
          {order.type === 'takeaway' && (
            <span className="px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-semibold bg-warning/15 text-warning">
              سفري
            </span>
          )}
          {order.type === 'pickup' && (
            <span className="px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-semibold bg-accent/15 text-accent">
              استلام
            </span>
          )}
          {order.is_edited && (
            <span className="px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-semibold bg-info/15 text-info flex items-center gap-1">
              <Pencil className="w-3 h-3" />
              معدّل
            </span>
          )}
          {order.has_issue && (
            <span className="px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-semibold bg-destructive/15 text-destructive flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              بلاغ
            </span>
          )}
          {order.order_source && (
            <span className="px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-semibold bg-muted text-muted-foreground">
              {ORDER_SOURCE_LABELS[order.order_source] || order.order_source}
            </span>
          )}
        </div>
        {order.status !== 'cancelled' && order.status !== 'delivered' && (
          <OrderTimer startTime={order.created_at} />
        )}
      </div>

      {/* Customer Info */}
      {showCustomerInfo && (
        <div className="mb-2 sm:mb-3 p-3 bg-muted/40 rounded-2xl">
          <p className="font-semibold text-foreground text-sm sm:text-base">{order.customer_name}</p>
          {order.customer_phone && (
            <p className="text-xs sm:text-sm text-muted-foreground">{toEnglishNumbers(order.customer_phone)}</p>
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
                <span className="w-6 h-6 flex items-center justify-center bg-primary/10 text-primary rounded-full text-[10px] sm:text-xs font-bold">
                  {toEnglishNumbers(item.quantity)}
                </span>
                <span className="text-foreground truncate max-w-[120px] sm:max-w-none">{item.menu_item_name}</span>
                {item.notes && (
                  <MessageSquare className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-warning flex-shrink-0" />
                )}
              </div>
              <span className="text-muted-foreground text-[10px] sm:text-xs">
                {formatNumberWithCommas(Number(item.menu_item_price) * item.quantity)} د.ع
              </span>
            </div>
          ))}
          {/* Price breakdown */}
          <div className="pt-2 mt-1 border-t border-dashed border-border/70 space-y-1">
            {order.type === 'delivery' && order.delivery_fee > 0 && (
              <>
                <div className="flex items-center justify-between text-xs sm:text-sm text-muted-foreground">
                  <span>سعر الطلب</span>
                  <span>{formatNumberWithCommas(Number(order.total_price) - Number(order.delivery_fee))} د.ع</span>
                </div>
                <div className="flex items-center justify-between text-xs sm:text-sm text-info">
                  <span className="flex items-center gap-1">
                    <Truck className="w-3 h-3" />
                    أجرة التوصيل
                  </span>
                  <span>{formatNumberWithCommas(Number(order.delivery_fee))} د.ع</span>
                </div>
              </>
            )}
            <div className="flex items-center justify-between font-bold text-sm sm:text-base pt-1">
              <span>المجموع</span>
              <span className="text-primary text-base sm:text-lg">{formatNumberWithCommas(Number(order.total_price))} <span className="text-xs opacity-70 font-medium">د.ع</span></span>
            </div>
          </div>
        </div>
      )}

      {/* Notes */}
      {order.notes && (
        <div className="mb-3 p-3 bg-warning/10 border border-warning/30 rounded-2xl">
          <p className="text-sm text-warning flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            {order.notes}
          </p>
        </div>
      )}

      {/* Delivery Person */}
      {order.delivery_person_name && (
        <div className="mb-3 p-3 bg-info/10 border border-info/30 rounded-2xl">
          <p className="text-sm text-info flex items-center gap-2">
            <Truck className="w-4 h-4" />
            موظف التوصيل: {order.delivery_person_name}
          </p>
        </div>
      )}

      {/* Cancellation Reason */}
      {order.cancellation_reason && (
        <div className="mb-3 p-3 bg-destructive/10 border border-destructive/30 rounded-2xl">
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
