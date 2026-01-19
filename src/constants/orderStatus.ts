// Order status labels and colors
export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: 'قيد الانتظار',
  preparing: 'قيد التجهيز',
  ready: 'جاهز',
  delivering: 'قيد التوصيل',
  delivered: 'تم التسليم',
  cancelled: 'ملغي',
};

export const ORDER_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-warning/10 text-warning border-warning/30',
  preparing: 'bg-info/10 text-info border-info/30',
  ready: 'bg-success/10 text-success border-success/30',
  delivering: 'bg-secondary/10 text-secondary border-secondary/30',
  delivered: 'bg-muted text-muted-foreground border-border',
  cancelled: 'bg-destructive/10 text-destructive border-destructive/30',
};

export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'delivering' | 'delivered' | 'cancelled';
export type OrderType = 'delivery' | 'takeaway';
