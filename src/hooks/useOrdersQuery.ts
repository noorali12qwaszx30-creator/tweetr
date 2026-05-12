// Orders data fetching and realtime subscription
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNotificationSound } from './useNotificationSound';
import { toast } from 'sonner';
import { DbMenuItem, DbOrder, DbOrderItem, OrderWithItems } from './useSupabaseOrders';

interface UseOrdersQueryOptions {
  orderTypeFilter?: 'delivery' | 'takeaway' | 'all';
  deliveryPersonId?: string;
}

const FALLBACK_POLLING_INTERVAL = 30000;
const SILENT_REFRESH_INTERVAL = 8000;
const ORDERS_PAGE_SIZE = 1000;

export function useOrdersQuery(options: UseOrdersQueryOptions = {}) {
  const { orderTypeFilter = 'all', deliveryPersonId } = options;
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [menuItems, setMenuItems] = useState<DbMenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const { playNotificationSound } = useNotificationSound();

  const orderTypeFilterRef = useRef(orderTypeFilter);
  const shownNotificationsRef = useRef(new Set<string>());
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const itemsChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const silentRefreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    orderTypeFilterRef.current = orderTypeFilter;
  }, [orderTypeFilter]);

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

  const fetchOrders = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading((prev) => prev && true);
    }
    const allRows: any[] = [];
    let from = 0;

    while (true) {
      let query = supabase
        .from('orders')
        .select(`*, order_items (*)`)
        .eq('is_archived', false);

      if (deliveryPersonId) {
        // Server-side scope: only this driver's orders + ready orders awaiting pickup
        query = query.or(
          `delivery_person_id.eq.${deliveryPersonId},and(status.eq.ready,pending_delivery_acceptance.eq.false,delivery_person_id.is.null)`
        );
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .range(from, from + ORDERS_PAGE_SIZE - 1);

      if (error) {
        console.error('Error fetching orders:', error);
        if (!silent) setLoading(false);
        return;
      }

      const pageRows = data || [];
      allRows.push(...pageRows);

      if (pageRows.length < ORDERS_PAGE_SIZE) break;
      from += ORDERS_PAGE_SIZE;
    }

    const ordersWithItems: OrderWithItems[] = allRows.map(order => ({
      ...order,
      items: (order.order_items || []) as DbOrderItem[],
    })) as OrderWithItems[];

    setOrders(ordersWithItems);
    if (!silent) setLoading(false);
  }, [deliveryPersonId]);

  const showNotification = useCallback((key: string, type: 'success' | 'info' | 'warning' | 'error', message: string, sound?: string) => {
    if (!shownNotificationsRef.current.has(key)) {
      shownNotificationsRef.current.add(key);
      if (sound) playNotificationSound(sound as any);
      toast[type](message, { id: key, duration: 3000 });
      setTimeout(() => shownNotificationsRef.current.delete(key), 5000);
    }
  }, [playNotificationSound]);

  const handleOrderInsert = useCallback(async (newOrder: DbOrder) => {
    const shouldNotify = orderTypeFilterRef.current === 'all' || newOrder.type === orderTypeFilterRef.current;
    if (shouldNotify) {
      showNotification(`insert-${newOrder.id}`, 'success', 'طلب جديد!', 'newOrder');
    }

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
      if (exists) return prev.map(o => o.id === newOrder.id ? orderWithItems : o);
      return [orderWithItems, ...prev];
    });
  }, [showNotification]);

  const handleOrderUpdate = useCallback(async (newOrder: DbOrder, oldOrder: Partial<DbOrder>) => {
    const shouldNotify = orderTypeFilterRef.current === 'all' || newOrder.type === orderTypeFilterRef.current;

    // If the order is not in our local state yet (e.g. just assigned to this driver),
    // fetch its items and add it instead of silently dropping the update.
    let needsInsert = false;
    setOrders(prev => {
      if (!prev.some(o => o.id === newOrder.id)) {
        needsInsert = true;
        return prev;
      }
      return prev.map(o => o.id === newOrder.id ? { ...o, ...newOrder } : o);
    });

    if (needsInsert) {
      const { data: itemsData } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', newOrder.id);
      const orderWithItems: OrderWithItems = {
        ...newOrder,
        items: (itemsData || []) as DbOrderItem[],
      };
      setOrders(prev => {
        if (prev.some(o => o.id === newOrder.id)) {
          return prev.map(o => o.id === newOrder.id ? orderWithItems : o);
        }
        return [orderWithItems, ...prev];
      });
    }

    if (!shouldNotify) return;

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

    if (oldOrder.pending_delivery_acceptance === true && 
        newOrder.pending_delivery_acceptance === false && 
        newOrder.status === 'ready' && 
        newOrder.delivery_person_id === null) {
      showNotification(`rejected-${newOrder.id}`, 'warning', `تم رفض الطلب #${newOrder.order_number} من موظف التوصيل`, 'alert');
    }

    if (oldOrder.has_issue !== true && newOrder.has_issue === true) {
      showNotification(`issue-${newOrder.id}`, 'error', `⚠️ بلاغ جديد على الطلب #${newOrder.order_number}`, 'alert');
    }

    if (oldOrder.has_issue === true && newOrder.has_issue === false) {
      showNotification(`issue-resolved-${newOrder.id}`, 'success', `✅ تم حل مشكلة الطلب #${newOrder.order_number}`, 'orderReady');
    }
  }, [showNotification]);

  const handleOrderDelete = useCallback((deletedOrder: DbOrder) => {
    setOrders(prev => prev.filter(o => o.id !== deletedOrder.id));
  }, []);

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

  const setupRealtimeChannel = useCallback(() => {
    if (channelRef.current) supabase.removeChannel(channelRef.current);
    if (itemsChannelRef.current) supabase.removeChannel(itemsChannelRef.current);

    const channelId = Math.random().toString(36).substring(7);

    channelRef.current = supabase
      .channel(`orders-${channelId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, 
        (payload) => handleOrderInsert(payload.new as DbOrder))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, 
        (payload) => handleOrderUpdate(payload.new as DbOrder, payload.old as Partial<DbOrder>))
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'orders' }, 
        (payload) => handleOrderDelete(payload.old as DbOrder))
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setRealtimeConnected(true);
          fetchOrders(true);
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setRealtimeConnected(false);
          fetchOrders(true);
          if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = setTimeout(() => setupRealtimeChannel(), 5000);
        } else if (status === 'CLOSED') {
          setRealtimeConnected(false);
        }
      });

    itemsChannelRef.current = supabase
      .channel(`order-items-${channelId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, 
        (payload) => handleOrderItemsChange((payload.new || payload.old) as DbOrderItem))
      .subscribe();
  }, [handleOrderInsert, handleOrderUpdate, handleOrderDelete, handleOrderItemsChange]);

  useEffect(() => {
    if (!realtimeConnected && !pollingIntervalRef.current) {
      fetchOrders();
      pollingIntervalRef.current = setInterval(() => fetchOrders(), FALLBACK_POLLING_INTERVAL);
    } else if (realtimeConnected && pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, [realtimeConnected, fetchOrders]);

  useEffect(() => {
    Promise.all([fetchMenuItems(), fetchOrders()]);
    setupRealtimeChannel();

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      if (itemsChannelRef.current) supabase.removeChannel(itemsChannelRef.current);
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (silentRefreshIntervalRef.current) clearInterval(silentRefreshIntervalRef.current);
    };
  }, [fetchMenuItems, fetchOrders, setupRealtimeChannel]);

  // Silent background refresh — only when realtime is NOT connected,
  // to avoid races that overwrite recent optimistic updates (e.g. accept order)
  useEffect(() => {
    if (realtimeConnected) {
      if (silentRefreshIntervalRef.current) {
        clearInterval(silentRefreshIntervalRef.current);
        silentRefreshIntervalRef.current = null;
      }
      return;
    }
    if (!silentRefreshIntervalRef.current) {
      silentRefreshIntervalRef.current = setInterval(() => fetchOrders(true), SILENT_REFRESH_INTERVAL);
    }
    return () => {
      if (silentRefreshIntervalRef.current) {
        clearInterval(silentRefreshIntervalRef.current);
        silentRefreshIntervalRef.current = null;
      }
    };
  }, [realtimeConnected, fetchOrders]);

  return {
    orders,
    setOrders,
    menuItems,
    loading,
    realtimeConnected,
    fetchOrders,
    playNotificationSound,
  };
}
