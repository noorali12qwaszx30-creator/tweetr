// Hybrid realtime system with polling fallback
import { useState, useEffect, useCallback, useRef } from 'react';
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
  orderTypeFilter?: 'delivery' | 'takeaway' | 'all';
}

// Polling interval when realtime fails (30 seconds)
const FALLBACK_POLLING_INTERVAL = 30000;

// Silent background refresh interval (3 seconds)
const SILENT_REFRESH_INTERVAL = 3000;

export function useSupabaseOrders(options: UseSupabaseOrdersOptions = {}) {
  const { orderTypeFilter = 'all' } = options;
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [menuItems, setMenuItems] = useState<DbMenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const { playNotificationSound } = useNotificationSound();

  // Use refs to avoid re-subscriptions
  const orderTypeFilterRef = useRef(orderTypeFilter);
  const shownNotificationsRef = useRef(new Set<string>());
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const itemsChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const silentRefreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Update ref when filter changes
  useEffect(() => {
    orderTypeFilterRef.current = orderTypeFilter;
  }, [orderTypeFilter]);

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

  // Fetch orders with items (silent mode doesn't change loading state)
  const fetchOrders = useCallback(async (silent = false) => {
    const { data, error } = await supabase
      .from('orders')
      .select(`*, order_items (*)`)
      .eq('is_archived', false)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching orders:', error);
      if (!silent) setLoading(false);
      return;
    }

    const ordersWithItems: OrderWithItems[] = (data || []).map(order => ({
      ...order,
      items: (order.order_items || []) as DbOrderItem[],
    })) as OrderWithItems[];

    setOrders(ordersWithItems);
    if (!silent) setLoading(false);
  }, []);

  // Show notification helper
  const showNotification = useCallback((key: string, type: 'success' | 'info' | 'warning' | 'error', message: string, sound?: string) => {
    if (!shownNotificationsRef.current.has(key)) {
      shownNotificationsRef.current.add(key);
      if (sound) playNotificationSound(sound as any);
      toast[type](message, { id: key, duration: 3000 });
      setTimeout(() => shownNotificationsRef.current.delete(key), 5000);
    }
  }, [playNotificationSound]);

  // Handle order INSERT
  const handleOrderInsert = useCallback(async (newOrder: DbOrder) => {
    const shouldNotify = orderTypeFilterRef.current === 'all' || newOrder.type === orderTypeFilterRef.current;
    
    if (shouldNotify) {
      showNotification(`insert-${newOrder.id}`, 'success', 'طلب جديد!', 'newOrder');
    }

    // Fetch items for new order
    const { data: itemsData } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', newOrder.id);

    const orderWithItems: OrderWithItems = {
      ...newOrder,
      items: (itemsData || []) as DbOrderItem[],
    };

    setOrders(prev => {
      const exists = prev.some(o => o.id === newOrder.id);
      if (exists) {
        return prev.map(o => o.id === newOrder.id ? orderWithItems : o);
      }
      return [orderWithItems, ...prev];
    });
  }, [showNotification]);

  // Handle order UPDATE
  const handleOrderUpdate = useCallback((newOrder: DbOrder, oldOrder: Partial<DbOrder>) => {
    const shouldNotify = orderTypeFilterRef.current === 'all' || newOrder.type === orderTypeFilterRef.current;

    // Update local state immediately
    setOrders(prev => prev.map(o => o.id === newOrder.id ? { ...o, ...newOrder } : o));

    if (!shouldNotify) return;

    // Status change notifications
    if (oldOrder.status !== newOrder.status) {
      const key = `update-${newOrder.id}-${newOrder.status}`;
      switch (newOrder.status) {
        case 'preparing':
          showNotification(key, 'info', `الطلب #${newOrder.order_number} قيد التجهيز`, 'orderAssigned');
          break;
        case 'ready':
          showNotification(key, 'info', `الطلب #${newOrder.order_number} جاهز!`, 'orderReady');
          break;
        case 'cancelled':
          showNotification(key, 'error', `تم إلغاء الطلب #${newOrder.order_number}`, 'orderCancelled');
          break;
        case 'delivering':
          showNotification(key, 'info', `الطلب #${newOrder.order_number} في الطريق!`, 'orderAssigned');
          break;
        case 'delivered':
          showNotification(key, 'success', `تم تسليم الطلب #${newOrder.order_number}`, 'orderReady');
          break;
      }
    }

    // Delivery rejection notification
    if (oldOrder.pending_delivery_acceptance === true && 
        newOrder.pending_delivery_acceptance === false && 
        newOrder.status === 'ready' && 
        newOrder.delivery_person_id === null) {
      showNotification(`rejected-${newOrder.id}`, 'warning', `تم رفض الطلب #${newOrder.order_number} من موظف التوصيل`, 'alert');
    }

    // Issue reported notification
    if (oldOrder.has_issue !== true && newOrder.has_issue === true) {
      showNotification(`issue-${newOrder.id}`, 'error', `⚠️ بلاغ جديد على الطلب #${newOrder.order_number}`, 'alert');
    }

    // Issue resolved notification
    if (oldOrder.has_issue === true && newOrder.has_issue === false) {
      showNotification(`issue-resolved-${newOrder.id}`, 'success', `✅ تم حل مشكلة الطلب #${newOrder.order_number}`, 'orderReady');
    }
  }, [showNotification]);

  // Handle order DELETE
  const handleOrderDelete = useCallback((deletedOrder: DbOrder) => {
    setOrders(prev => prev.filter(o => o.id !== deletedOrder.id));
  }, []);

  // Handle order items change
  const handleOrderItemsChange = useCallback(async (orderItem: DbOrderItem) => {
    if (!orderItem?.order_id) return;

    const { data: itemsData } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', orderItem.order_id);

    setOrders(prev => prev.map(o => 
      o.id === orderItem.order_id 
        ? { ...o, items: (itemsData || []) as DbOrderItem[] }
        : o
    ));
  }, []);

  // Setup realtime channel
  const setupRealtimeChannel = useCallback(() => {
    // Clean up existing channels
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }
    if (itemsChannelRef.current) {
      supabase.removeChannel(itemsChannelRef.current);
    }

    const channelId = Math.random().toString(36).substring(7);

    // Orders channel
    channelRef.current = supabase
      .channel(`orders-${channelId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, 
        (payload) => handleOrderInsert(payload.new as DbOrder))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, 
        (payload) => handleOrderUpdate(payload.new as DbOrder, payload.old as Partial<DbOrder>))
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'orders' }, 
        (payload) => handleOrderDelete(payload.old as DbOrder))
      .subscribe((status, err) => {
        console.log('Orders channel status:', status);
        
        if (status === 'SUBSCRIBED') {
          setRealtimeConnected(true);
          // Fetch latest data when reconnected to ensure sync
          fetchOrders();
          // Clear polling when connected
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.log('Realtime error, switching to polling fallback');
          setRealtimeConnected(false);
          // Fetch immediately when connection lost
          fetchOrders();
          
          // Clear any pending reconnect
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }
          
          // Try to reconnect after 5 seconds
          reconnectTimeoutRef.current = setTimeout(() => {
            setupRealtimeChannel();
          }, 5000);
        } else if (status === 'CLOSED') {
          setRealtimeConnected(false);
        }
      });

    // Order items channel
    itemsChannelRef.current = supabase
      .channel(`order-items-${channelId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, 
        (payload) => handleOrderItemsChange((payload.new || payload.old) as DbOrderItem))
      .subscribe();

  }, [handleOrderInsert, handleOrderUpdate, handleOrderDelete, handleOrderItemsChange]);

  // Start/stop polling based on connection status
  useEffect(() => {
    if (!realtimeConnected && !pollingIntervalRef.current) {
      console.log('Starting fallback polling');
      // Fetch immediately when polling starts, don't wait for first interval
      fetchOrders();
      pollingIntervalRef.current = setInterval(() => {
        fetchOrders();
      }, FALLBACK_POLLING_INTERVAL);
    } else if (realtimeConnected && pollingIntervalRef.current) {
      console.log('Stopping fallback polling - realtime connected');
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, [realtimeConnected, fetchOrders]);

  // Initial setup and silent background refresh
  useEffect(() => {
    // Fetch data in parallel
    Promise.all([fetchMenuItems(), fetchOrders()]);
    
    // Setup realtime
    setupRealtimeChannel();

    // Start silent background refresh every 3 seconds
    silentRefreshIntervalRef.current = setInterval(() => {
      fetchOrders(true); // Silent refresh - no loading indicator
    }, SILENT_REFRESH_INTERVAL);

    return () => {
      // Cleanup
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      if (itemsChannelRef.current) {
        supabase.removeChannel(itemsChannelRef.current);
      }
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (silentRefreshIntervalRef.current) {
        clearInterval(silentRefreshIntervalRef.current);
      }
    };
  }, [fetchMenuItems, fetchOrders, setupRealtimeChannel]);

  // Add new order
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

      // Optimistic update
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
        
        setOrders(prev => [newOrderWithItems, ...prev]);
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
    setOrders(prev => prev.map(order => 
      order.id === orderId ? { ...order, status } : order
    ));

    const { error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', orderId);

    if (error) {
      console.error('Error updating order status:', error);
      toast.error('حدث خطأ في تحديث حالة الطلب');
      fetchOrders();
      return false;
    }

    return true;
  };

  // Assign delivery person
  const assignDelivery = async (orderId: string, deliveryPersonId: string, deliveryPersonName: string) => {
    setOrders(prev => prev.map(order => 
      order.id === orderId 
        ? { ...order, delivery_person_id: deliveryPersonId, delivery_person_name: deliveryPersonName, pending_delivery_acceptance: true } 
        : order
    ));

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
      fetchOrders();
      return false;
    }

    playNotificationSound('orderAssigned');
    toast.success('تم تعيين موظف التوصيل', { id: `assign-${orderId}` });
    return true;
  };

  // Accept delivery
  const acceptDelivery = async (orderId: string) => {
    setOrders(prev => prev.map(order => 
      order.id === orderId 
        ? { ...order, status: 'delivering' as const, pending_delivery_acceptance: false } 
        : order
    ));

    const { error } = await supabase
      .from('orders')
      .update({ status: 'delivering', pending_delivery_acceptance: false })
      .eq('id', orderId);

    if (error) {
      console.error('Error accepting delivery:', error);
      toast.error('حدث خطأ في قبول الطلب');
      fetchOrders();
      return false;
    }

    playNotificationSound('orderReady');
    toast.success('تم قبول الطلب', { id: `accept-${orderId}` });
    return true;
  };

  // Reject delivery
  const rejectDelivery = async (orderId: string) => {
    setOrders(prev => prev.map(order => 
      order.id === orderId 
        ? { ...order, delivery_person_id: null, delivery_person_name: null, pending_delivery_acceptance: false, status: 'ready' as const } 
        : order
    ));

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
      fetchOrders();
      return false;
    }

    playNotificationSound('alert');
    toast.info('تم رفض الطلب', { id: `reject-${orderId}` });
    return true;
  };

  // Return order
  const returnOrder = async (orderId: string, reason?: string) => {
    const cancellationReason = reason || 'راجع';
    
    setOrders(prev => prev.map(order => 
      order.id === orderId 
        ? { ...order, status: 'cancelled' as const, cancellation_reason: cancellationReason } 
        : order
    ));

    const { error } = await supabase
      .from('orders')
      .update({ status: 'cancelled', cancellation_reason: cancellationReason })
      .eq('id', orderId);

    if (error) {
      console.error('Error returning order:', error);
      toast.error('حدث خطأ في إرجاع الطلب');
      fetchOrders();
      return false;
    }

    playNotificationSound('orderCancelled');
    toast.warning('تم إرجاع الطلب', { id: `return-${orderId}` });
    return true;
  };

  // Cancel order
  const cancelOrder = async (orderId: string, reason?: string) => {
    setOrders(prev => prev.map(order => 
      order.id === orderId 
        ? { ...order, status: 'cancelled' as const, cancellation_reason: reason || null } 
        : order
    ));

    const { error } = await supabase
      .from('orders')
      .update({ status: 'cancelled', cancellation_reason: reason || null })
      .eq('id', orderId);

    if (error) {
      console.error('Error cancelling order:', error);
      toast.error('حدث خطأ في إلغاء الطلب');
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

  // Update order
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

  // Report issue
  const reportIssue = async (orderId: string, reason: string, reporterName: string) => {
    setOrders(prev => prev.map(order => 
      order.id === orderId 
        ? { 
            ...order, 
            has_issue: true,
            issue_reason: reason,
            issue_reported_at: new Date().toISOString(),
            issue_reported_by: reporterName
          } 
        : order
    ));

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
      fetchOrders();
      return false;
    }

    playNotificationSound('alert');
    toast.warning('تم التبليغ عن المشكلة', { id: `issue-${orderId}` });
    return true;
  };

  // Resolve issue
  const resolveIssue = async (orderId: string) => {
    setOrders(prev => prev.map(order => 
      order.id === orderId 
        ? { ...order, has_issue: false, issue_reason: null, issue_reported_at: null, issue_reported_by: null } 
        : order
    ));

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
    realtimeConnected,
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
