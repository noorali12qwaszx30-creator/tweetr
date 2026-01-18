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
  // Issue reporting fields
  has_issue?: boolean;
  issue_reason?: string | null;
  issue_reported_at?: string | null;
  issue_reported_by?: string | null;
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
  /** Filter orders by type - 'delivery' for field/cashier, 'takeaway' for takeaway dashboard */
  orderTypeFilter?: 'delivery' | 'takeaway' | 'all';
}

export function useSupabaseOrders(options: UseSupabaseOrdersOptions = {}) {
  const { orderTypeFilter = 'all' } = options;
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

  // Fetch orders with items in a single query using Supabase relations
  const fetchOrders = useCallback(async () => {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (*)
      `)
      .eq('is_archived', false)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching orders:', error);
      setLoading(false);
      return;
    }

    const ordersWithItems: OrderWithItems[] = (data || []).map(order => ({
      ...order,
      items: (order.order_items || []) as DbOrderItem[],
    })) as OrderWithItems[];

    setOrders(ordersWithItems);
    setLoading(false);
  }, []);

  // Subscribe to realtime updates
  useEffect(() => {
    // Fetch menu items and orders in parallel for faster loading
    Promise.all([fetchMenuItems(), fetchOrders()]);

    // Track shown notifications to prevent duplicates
    const shownNotifications = new Set<string>();
    
    // Generate unique channel names to avoid conflicts
    const channelId = Math.random().toString(36).substring(7);
    
    // Subscribe to orders changes with specific events
    const ordersChannel = supabase
      .channel(`orders-realtime-${channelId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        (payload) => {
          console.log('New order received:', payload);
          const newOrder = payload.new as DbOrder;
          const notificationKey = `insert-${newOrder.id}`;
          
          // Only show notification if order type matches the filter
          const shouldNotify = orderTypeFilter === 'all' || newOrder.type === orderTypeFilter;
          
          if (shouldNotify && !shownNotifications.has(notificationKey)) {
            shownNotifications.add(notificationKey);
            playNotificationSound('newOrder');
            toast.success('طلب جديد!', { duration: 3000, id: notificationKey });
            
            // Clear from set after 5 seconds
            setTimeout(() => shownNotifications.delete(notificationKey), 5000);
          }
          
          fetchOrders();
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders' },
        (payload) => {
          console.log('Order updated:', payload);
          const newOrder = payload.new as DbOrder;
          const oldOrder = payload.old as Partial<DbOrder>;
          
          // Only show notification if order type matches the filter
          const shouldNotify = orderTypeFilter === 'all' || newOrder.type === orderTypeFilter;
          
          // Check if status changed
          const statusChanged = oldOrder.status !== newOrder.status;
          
          // Check if delivery was rejected (pending_delivery_acceptance changed from true to false while status is ready)
          const deliveryRejected = oldOrder.pending_delivery_acceptance === true && 
                                   newOrder.pending_delivery_acceptance === false && 
                                   newOrder.status === 'ready' &&
                                   newOrder.delivery_person_id === null;
          
          // Show notification for status changes
          if (shouldNotify && statusChanged) {
            const notificationKey = `update-${newOrder.id}-${newOrder.status}`;
            
            if (!shownNotifications.has(notificationKey)) {
              shownNotifications.add(notificationKey);
              
              if (newOrder.status === 'ready') {
                playNotificationSound('orderReady');
                toast.info(`الطلب #${newOrder.order_number} جاهز!`, { id: notificationKey });
              } else if (newOrder.status === 'cancelled') {
                playNotificationSound('orderCancelled');
                toast.error(`تم إلغاء الطلب #${newOrder.order_number}`, { id: notificationKey });
              } else if (newOrder.status === 'delivering') {
                playNotificationSound('orderAssigned');
                toast.info(`الطلب #${newOrder.order_number} في الطريق!`, { id: notificationKey });
              } else if (newOrder.status === 'delivered') {
                playNotificationSound('orderReady');
                toast.success(`تم تسليم الطلب #${newOrder.order_number}`, { id: notificationKey });
              }
              
              // Clear from set after 5 seconds
              setTimeout(() => shownNotifications.delete(notificationKey), 5000);
            }
          }
          
          // Show notification for delivery rejection
          if (shouldNotify && deliveryRejected) {
            const notificationKey = `rejected-${newOrder.id}`;
            
            if (!shownNotifications.has(notificationKey)) {
              shownNotifications.add(notificationKey);
              playNotificationSound('alert');
              toast.warning(`تم رفض الطلب #${newOrder.order_number} من موظف التوصيل`, { id: notificationKey });
              
              // Clear from set after 5 seconds
              setTimeout(() => shownNotifications.delete(notificationKey), 5000);
            }
          }
          
          // Check if issue was reported
          const issueReported = oldOrder.has_issue !== true && newOrder.has_issue === true;
          
          if (shouldNotify && issueReported) {
            const notificationKey = `issue-${newOrder.id}`;
            
            if (!shownNotifications.has(notificationKey)) {
              shownNotifications.add(notificationKey);
              playNotificationSound('alert');
              toast.error(`⚠️ بلاغ جديد على الطلب #${newOrder.order_number}`, { id: notificationKey });
              
              // Clear from set after 5 seconds
              setTimeout(() => shownNotifications.delete(notificationKey), 5000);
            }
          }
          
          // Check if issue was resolved
          const issueResolved = oldOrder.has_issue === true && newOrder.has_issue === false;
          
          if (shouldNotify && issueResolved) {
            const notificationKey = `issue-resolved-${newOrder.id}`;
            
            if (!shownNotifications.has(notificationKey)) {
              shownNotifications.add(notificationKey);
              playNotificationSound('orderReady');
              toast.success(`✅ تم حل مشكلة الطلب #${newOrder.order_number}`, { id: notificationKey });
              
              // Clear from set after 5 seconds
              setTimeout(() => shownNotifications.delete(notificationKey), 5000);
            }
          }
          
          fetchOrders();
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'orders' },
        () => {
          fetchOrders();
        }
      )
      .subscribe((status) => {
        console.log('Orders channel status:', status);
        // Retry connection on error
        if (status === 'CHANNEL_ERROR') {
          console.log('Channel error, retrying in 3 seconds...');
          setTimeout(() => {
            fetchOrders();
          }, 3000);
        }
      });

    // Subscribe to order_items changes
    const itemsChannel = supabase
      .channel(`order-items-realtime-${channelId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'order_items' },
        () => {
          fetchOrders();
        }
      )
      .subscribe((status) => {
        console.log('Order items channel status:', status);
        if (status === 'CHANNEL_ERROR') {
          setTimeout(() => {
            fetchOrders();
          }, 3000);
        }
      });

    return () => {
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(itemsChannel);
    };
  }, [fetchMenuItems, fetchOrders, playNotificationSound, orderTypeFilter]);

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

      // Immediately add the order to local state (optimistic update)
      if (data?.order) {
        const newOrderWithItems: OrderWithItems = {
          ...data.order,
          items: orderData.items.map((item, index) => ({
            id: `temp-${index}`,
            order_id: data.order.id,
            menu_item_id: item.menu_item_id || null,
            menu_item_name: item.menu_item_name,
            menu_item_price: item.menu_item_price,
            quantity: item.quantity,
            notes: item.notes || null,
          })),
        };
        
        setOrders(prevOrders => [newOrderWithItems, ...prevOrders]);
        
        // Fetch fresh data in background to get correct items
        setTimeout(() => fetchOrders(), 500);
      }

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
    // Optimistic update - immediately update local state
    setOrders(prevOrders => 
      prevOrders.map(order => 
        order.id === orderId 
          ? { 
              ...order, 
              delivery_person_id: deliveryPersonId, 
              delivery_person_name: deliveryPersonName, 
              pending_delivery_acceptance: true 
            } 
          : order
      )
    );

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
      // Revert on error
      fetchOrders();
      return false;
    }

    playNotificationSound('orderAssigned');
    toast.success('تم تعيين موظف التوصيل', { id: `assign-${orderId}` });
    return true;
  };

  // Accept delivery
  const acceptDelivery = async (orderId: string) => {
    // Optimistic update - immediately update local state
    setOrders(prevOrders => 
      prevOrders.map(order => 
        order.id === orderId 
          ? { ...order, status: 'delivering' as const, pending_delivery_acceptance: false } 
          : order
      )
    );

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
      // Revert on error
      fetchOrders();
      return false;
    }

    playNotificationSound('orderReady');
    toast.success('تم قبول الطلب', { id: `accept-${orderId}` });
    return true;
  };

  // Reject delivery
  const rejectDelivery = async (orderId: string) => {
    // Optimistic update - immediately update local state
    setOrders(prevOrders => 
      prevOrders.map(order => 
        order.id === orderId 
          ? { 
              ...order, 
              delivery_person_id: null, 
              delivery_person_name: null, 
              pending_delivery_acceptance: false,
              status: 'ready' as const
            } 
          : order
      )
    );

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
      // Revert on error
      fetchOrders();
      return false;
    }

    playNotificationSound('alert');
    toast.info('تم رفض الطلب', { id: `reject-${orderId}` });
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

    playNotificationSound('orderCancelled');
    toast.warning('تم إرجاع الطلب', { id: `return-${orderId}` });
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

    playNotificationSound('orderCancelled');
    toast.warning('تم إلغاء الطلب', { id: `cancel-${orderId}` });
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

      playNotificationSound('orderReady');
      toast.success('تم تعديل الطلب بنجاح', { id: `update-order-${orderId}` });
      await fetchOrders();
      return data.order;
    } catch (err) {
      console.error('Unexpected error updating order:', err);
      toast.error('حدث خطأ غير متوقع');
      return null;
    }
  };

  // Report issue on order (for delivery person)
  const reportIssue = async (orderId: string, reason: string, reporterName: string) => {
    // Optimistic update
    setOrders(prevOrders => 
      prevOrders.map(order => 
        order.id === orderId 
          ? { 
              ...order, 
              has_issue: true,
              issue_reason: reason,
              issue_reported_at: new Date().toISOString(),
              issue_reported_by: reporterName
            } 
          : order
      )
    );

    const { error } = await supabase
      .from('orders')
      .update({
        has_issue: true,
        issue_reason: reason,
        issue_reported_at: new Date().toISOString(),
        issue_reported_by: reporterName,
      })
      .eq('id', orderId);

    if (error) {
      console.error('Error reporting issue:', error);
      toast.error('حدث خطأ في التبليغ عن المشكلة');
      // Revert on error
      fetchOrders();
      return false;
    }

    playNotificationSound('alert');
    toast.warning('تم التبليغ عن المشكلة', { id: `issue-${orderId}` });
    return true;
  };

  // Resolve issue on order (for cashier)
  const resolveIssue = async (orderId: string) => {
    // Optimistic update
    setOrders(prevOrders => 
      prevOrders.map(order => 
        order.id === orderId 
          ? { 
              ...order, 
              has_issue: false,
              issue_reason: null,
              issue_reported_at: null,
              issue_reported_by: null
            } 
          : order
      )
    );

    const { error } = await supabase
      .from('orders')
      .update({
        has_issue: false,
        issue_reason: null,
        issue_reported_at: null,
        issue_reported_by: null,
      })
      .eq('id', orderId);

    if (error) {
      console.error('Error resolving issue:', error);
      toast.error('حدث خطأ في حل المشكلة');
      // Revert on error
      fetchOrders();
      return false;
    }

    playNotificationSound('orderReady');
    toast.success('تم حل المشكلة', { id: `resolve-${orderId}` });
    return true;
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
    reportIssue,
    resolveIssue,
    getOrdersByStatus,
    refetch: fetchOrders,
  };
}
