export type UserRole = 'cashier' | 'field' | 'delivery' | 'takeaway' | 'admin';

export interface User {
  id: string;
  username: string;
  role: UserRole;
}

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  image: string;
  category: string;
}

export interface OrderItem {
  menuItem: MenuItem;
  quantity: number;
  notes?: string;
}

export interface Customer {
  name: string;
  phone: string;
  address: string;
}

export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'delivering' | 'delivered' | 'cancelled';
export type OrderType = 'delivery' | 'takeaway';

export interface Order {
  id: string;
  orderNumber: number;
  customer: Customer;
  items: OrderItem[];
  status: OrderStatus;
  type: OrderType;
  notes?: string;
  totalPrice: number;
  deliveryFee: number;
  createdAt: Date;
  deliveryPersonId?: string;
  deliveryPersonName?: string;
  cashierName: string;
  pendingDeliveryAcceptance?: boolean;
  cancellationReason?: string;
}

export const ROLE_LABELS: Record<UserRole, string> = {
  cashier: 'كاشير',
  field: 'الميدان',
  delivery: 'موظف توصيل',
  takeaway: 'السفري',
  admin: 'المدير التنفيذي',
};

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'قيد الانتظار',
  preparing: 'قيد التجهيز',
  ready: 'جاهز',
  delivering: 'قيد التوصيل',
  delivered: 'تم التسليم',
  cancelled: 'ملغي',
};

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  pending: 'bg-warning/10 text-warning border-warning/30',
  preparing: 'bg-info/10 text-info border-info/30',
  ready: 'bg-success/10 text-success border-success/30',
  delivering: 'bg-secondary/10 text-secondary border-secondary/30',
  delivered: 'bg-muted text-muted-foreground border-border',
  cancelled: 'bg-destructive/10 text-destructive border-destructive/30',
};
