// Hybrid realtime system with polling fallback
// This file now re-exports types and composes useOrdersQuery + useOrderMutations
import { useOrdersQuery } from './useOrdersQuery';
import { useOrderMutations } from './useOrderMutations';

export interface DbMenuItem {
  id: string;
  name: string;
  price: number;
  image: string | null;
  category: string;
  is_available: boolean;
}

export interface DbOrder {
  id: string;
  order_number: number;
  customer_id: string | null;
  customer_name: string;
  customer_phone: string;
  customer_address: string | null;
  delivery_area_id: string | null;
  status: 'pending' | 'preparing' | 'ready' | 'delivering' | 'delivered' | 'cancelled';
  type: 'delivery' | 'takeaway' | 'pickup';
  notes: string | null;
  total_price: number;
  delivery_fee: number;
  cashier_id: string | null;
  cashier_name: string | null;
  delivery_person_id: string | null;
  delivery_person_name: string | null;
  pending_delivery_acceptance: boolean | null;
  cancellation_reason: string | null;
  created_at: string;
  updated_at: string;
  delivered_at: string | null;
  cancelled_at: string | null;
  is_edited?: boolean;
  edited_at?: string | null;
  has_issue?: boolean;
  issue_reason?: string | null;
  issue_reported_at?: string | null;
  issue_reported_by?: string | null;
  order_source?: string | null;
}

export interface DbOrderItem {
  id: string;
  order_id: string;
  menu_item_id: string | null;
  menu_item_name: string;
  menu_item_price: number;
  quantity: number;
  notes: string | null;
}

export interface OrderWithItems extends DbOrder {
  items: DbOrderItem[];
}

interface UseSupabaseOrdersOptions {
  orderTypeFilter?: 'delivery' | 'takeaway' | 'all';
}

export function useSupabaseOrders(options: UseSupabaseOrdersOptions = {}) {
  const { orders, setOrders, menuItems, loading, realtimeConnected, fetchOrders, playNotificationSound } = useOrdersQuery(options);
  
  const mutations = useOrderMutations({ setOrders, fetchOrders, playNotificationSound });

  const getOrdersByStatus = (status: DbOrder['status']) => {
    return orders.filter(o => o.status === status);
  };

  return {
    orders,
    menuItems,
    loading,
    realtimeConnected,
    addOrder: mutations.addOrder,
    updateOrder: mutations.updateOrder,
    updateOrderStatus: mutations.updateOrderStatus,
    assignDelivery: mutations.assignDelivery,
    acceptDelivery: mutations.acceptDelivery,
    rejectDelivery: mutations.rejectDelivery,
    returnOrder: mutations.returnOrder,
    cancelOrder: mutations.cancelOrder,
    reportIssue: mutations.reportIssue,
    resolveIssue: mutations.resolveIssue,
    getOrdersByStatus,
    refetch: fetchOrders,
  };
}
