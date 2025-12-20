import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNotificationSound } from './useNotificationSound';

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
  type: 'delivery' | 'takeaway';
  notes: string | null;
  total_price: number;
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

export function useSupabaseOrders() {
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [menuItems, setMenuItems] = useState<DbMenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { playNotificationSound } = useNotificationSound();

  // Fetch menu items
  const fetchMenuItems = useCallback(async () => {
    const { data, error } = await supabase
      .from('menu_items')
      .select('*')
      .eq('is_available', true)
      .order('category');

    if (error) {
      console.error('Error fetching menu items:', error);
      return;
    }

    setMenuItems(data as DbMenuItem[]);
  }, []);

  // Fetch orders with items
  const fetchOrders = useCallback(async () => {
    const { data: ordersData, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .eq('is_archived', false)
      .order('created_at', { ascending: false });

    if (ordersError) {
      console.error('Error fetching orders:', ordersError);
      return;
    }

    // Fetch items for all orders
    const orderIds = ordersData.map(o => o.id);
    const { data: itemsData, error: itemsError } = await supabase
      .from('order_items')
      .select('*')
      .in('order_id', orderIds.length > 0 ? orderIds : ['']);

    if (itemsError) {
      console.error('Error fetching order items:', itemsError);
    }

    const ordersWithItems: OrderWithItems[] = ordersData.map(order => ({
      ...order,
      items: (itemsData || []).filter(item => item.order_id === order.id) as DbOrderItem[],
    })) as OrderWithItems[];

    setOrders(ordersWithItems);
    setLoading(false);
  }, []);

  // Subscribe to realtime updates
  useEffect(() => {
    fetchMenuItems();
    fetchOrders();

    // Subscribe to orders changes
    const ordersChannel = supabase
      .channel('orders-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload) => {
          console.log('Order change:', payload);
          
          if (payload.eventType === 'INSERT') {
            playNotificationSound();
            toast.success('طلب جديد!', { duration: 3000 });
          } else if (payload.eventType === 'UPDATE') {
            const newOrder = payload.new as DbOrder;
            if (newOrder.status === 'ready') {
              playNotificationSound();
              toast.info(`الطلب #${newOrder.order_number} جاهز!`);
            } else if (newOrder.status === 'cancelled') {
              playNotificationSound();
              toast.error(`تم إلغاء الطلب #${newOrder.order_number}`);
            } else if (newOrder.status === 'delivering') {
              playNotificationSound();
              toast.info(`الطلب #${newOrder.order_number} في الطريق!`);
            } else if (newOrder.status === 'delivered') {
              playNotificationSound();
              toast.success(`تم تسليم الطلب #${newOrder.order_number}`);
            }
          }
          
          fetchOrders();
        }
      )
      .subscribe();

    // Subscribe to order_items changes
    const itemsChannel = supabase
      .channel('order-items-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'order_items' },
        (payload) => {
          console.log('Order items change:', payload);
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(itemsChannel);
    };
  }, [fetchMenuItems, fetchOrders, playNotificationSound]);

  // Add new order via server-side edge function for price validation
  const addOrder = async (orderData: {
    customer_name: string;
    customer_phone: string;
    customer_address?: string;
    delivery_area_id?: string;
    type: 'delivery' | 'takeaway';
    notes?: string;
    cashier_id?: string;
    cashier_name?: string;
    items: { menu_item_id?: string; menu_item_name: string; menu_item_price: number; quantity: number; notes?: string }[];
  }) => {
    try {
      const { data, error } = await supabase.functions.invoke('create-order', {
        body: orderData,
      });

      if (error) {
        console.error('Error creating order:', error);
        toast.error('حدث خطأ في إنشاء الطلب');
        return null;
      }

      if (data?.error) {
        console.error('Server error:', data.error);
        toast.error(data.error);
        return null;
      }

      toast.success(`تم إنشاء الطلب #${data.order.order_number}`);
      return data.order;
    } catch (err) {
      console.error('Unexpected error creating order:', err);
      toast.error('حدث خطأ غير متوقع');
      return null;
    }
  };

  // Update order status
  const updateOrderStatus = async (orderId: string, status: DbOrder['status']) => {
    // Optimistic update - immediately update local state
    setOrders(prevOrders => 
      prevOrders.map(order => 
        order.id === orderId ? { ...order, status } : order
      )
    );

    const { error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', orderId);

    if (error) {
      console.error('Error updating order status:', error);
      toast.error('حدث خطأ في تحديث حالة الطلب');
      // Revert on error
      fetchOrders();
      return false;
    }

    return true;
  };

  // Assign delivery person
  const assignDelivery = async (orderId: string, deliveryPersonId: string, deliveryPersonName: string) => {
    const { error } = await supabase
      .from('orders')
      .update({
        delivery_person_id: deliveryPersonId,
        delivery_person_name: deliveryPersonName,
        pending_delivery_acceptance: true,
      })
      .eq('id', orderId);

    if (error) {
      console.error('Error assigning delivery:', error);
      toast.error('حدث خطأ في تعيين موظف التوصيل');
      return false;
    }

    toast.success('تم تعيين موظف التوصيل');
    return true;
  };

  // Accept delivery
  const acceptDelivery = async (orderId: string) => {
    const { error } = await supabase
      .from('orders')
      .update({
        status: 'delivering',
        pending_delivery_acceptance: false,
      })
      .eq('id', orderId);

    if (error) {
      console.error('Error accepting delivery:', error);
      toast.error('حدث خطأ في قبول الطلب');
      return false;
    }

    toast.success('تم قبول الطلب');
    return true;
  };

  // Reject delivery
  const rejectDelivery = async (orderId: string) => {
    const { error } = await supabase
      .from('orders')
      .update({
        delivery_person_id: null,
        delivery_person_name: null,
        pending_delivery_acceptance: false,
        status: 'ready',
      })
      .eq('id', orderId);

    if (error) {
      console.error('Error rejecting delivery:', error);
      toast.error('حدث خطأ في رفض الطلب');
      return false;
    }

    toast.info('تم رفض الطلب');
    return true;
  };

  // Return order (delivery person returns order - marks as cancelled with reason)
  const returnOrder = async (orderId: string, reason?: string) => {
    const cancellationReason = reason || 'راجع';
    
    // Optimistic update
    setOrders(prevOrders => 
      prevOrders.map(order => 
        order.id === orderId 
          ? { ...order, status: 'cancelled' as const, cancellation_reason: cancellationReason } 
          : order
      )
    );

    const { error } = await supabase
      .from('orders')
      .update({
        status: 'cancelled',
        cancellation_reason: cancellationReason,
      })
      .eq('id', orderId);

    if (error) {
      console.error('Error returning order:', error);
      toast.error('حدث خطأ في إرجاع الطلب');
      // Revert on error
      fetchOrders();
      return false;
    }

    toast.warning('تم إرجاع الطلب');
    return true;
  };

  // Cancel order
  const cancelOrder = async (orderId: string, reason?: string) => {
    // Optimistic update - immediately update local state
    setOrders(prevOrders => 
      prevOrders.map(order => 
        order.id === orderId 
          ? { ...order, status: 'cancelled' as const, cancellation_reason: reason || null } 
          : order
      )
    );

    const { error } = await supabase
      .from('orders')
      .update({
        status: 'cancelled',
        cancellation_reason: reason || null,
      })
      .eq('id', orderId);

    if (error) {
      console.error('Error cancelling order:', error);
      toast.error('حدث خطأ في إلغاء الطلب');
      // Revert on error
      fetchOrders();
      return false;
    }

    toast.warning('تم إلغاء الطلب');
    return true;
  };

  // Get orders by status
  const getOrdersByStatus = (status: DbOrder['status']) => {
    return orders.filter(o => o.status === status);
  };

  // Update order (edit items, customer info, etc.)
  const updateOrder = async (orderId: string, orderData: {
    customer_name?: string;
    customer_phone?: string;
    customer_address?: string;
    delivery_area_id?: string;
    notes?: string;
    items?: { menu_item_id?: string; menu_item_name: string; menu_item_price: number; quantity: number; notes?: string }[];
  }) => {
    try {
      const { data, error } = await supabase.functions.invoke('update-order', {
        body: { order_id: orderId, ...orderData },
      });

      if (error) {
        console.error('Error updating order:', error);
        toast.error('حدث خطأ في تعديل الطلب');
        return null;
      }

      if (data?.error) {
        console.error('Server error:', data.error);
        toast.error(data.error);
        return null;
      }

      toast.success('تم تعديل الطلب بنجاح');
      await fetchOrders();
      return data.order;
    } catch (err) {
      console.error('Unexpected error updating order:', err);
      toast.error('حدث خطأ غير متوقع');
      return null;
    }
  };

  return {
    orders,
    menuItems,
    loading,
    addOrder,
    updateOrder,
    updateOrderStatus,
    assignDelivery,
    acceptDelivery,
    rejectDelivery,
    returnOrder,
    cancelOrder,
    getOrdersByStatus,
    refetch: fetchOrders,
  };
}
