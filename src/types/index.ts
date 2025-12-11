export type UserRole = 'cashier' | 'field' | 'delivery' | 'takeaway' | 'kitchen' | 'admin';

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
  createdAt: Date;
  deliveryPersonId?: string;
  deliveryPersonName?: string;
  cashierName: string;
}

export const ROLE_LABELS: Record<UserRole, string> = {
  cashier: 'كاشيرة',
  field: 'الميدان',
  delivery: 'الدلفري',
  takeaway: 'السفري',
  kitchen: 'المطبخ',
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
