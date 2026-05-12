// Order CRUD mutation operations
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { DbOrder, OrderWithItems } from './useSupabaseOrders';

interface UseOrderMutationsProps {
  setOrders: React.Dispatch<React.SetStateAction<OrderWithItems[]>>;
  fetchOrders: (silent?: boolean) => Promise<void>;
  playNotificationSound: (sound: any) => void;
}

function isTransientInvokeError(error: any) {
  const message = `${error?.message || error?.name || error || ''}`.toLowerCase();
  const status = Number(error?.context?.status || error?.status || 0);
  return (
    status === 408 ||
    status === 429 ||
    status >= 500 ||
    message.includes('failed to fetch') ||
    message.includes('fetch') ||
    message.includes('network') ||
    message.includes('timeout') ||
    message.includes('internal') ||
    message.includes('functionshttperror') ||
    message.includes('auth')
  );
}

async function invokeWithRetry<T>(
  fn: () => Promise<{ data: T | null; error: any }>,
  attempts = 3,
) {
  let lastResult: { data: T | null; error: any } = { data: null, error: null };

  for (let attempt = 0; attempt < attempts; attempt++) {
    const result = await fn();
    lastResult = result;

    if (!result.error) {
      return result;
    }

    if (!isTransientInvokeError(result.error) || attempt === attempts - 1) {
      return result;
    }

    await new Promise((resolve) => setTimeout(resolve, 300 * (attempt + 1)));
  }

  return lastResult;
}

export function useOrderMutations({ setOrders, fetchOrders, playNotificationSound }: UseOrderMutationsProps) {
  
  const addOrder = async (orderData: {
    request_id?: string;
    customer_name: string;
    customer_phone: string;
    customer_address?: string;
    delivery_area_id?: string;
    type: 'delivery' | 'takeaway' | 'pickup';
    notes?: string;
    cashier_id?: string;
    cashier_name?: string;
    order_source?: string;
    items: { menu_item_id?: string; menu_item_name: string; menu_item_price: number; quantity: number; notes?: string }[];
  }) => {
    try {
      const requestId = orderData.request_id || crypto.randomUUID();
      const { data, error } = await invokeWithRetry(
        () => supabase.functions.invoke('create-order', {
          body: { ...orderData, request_id: requestId },
        }),
      );

      if (error) {
        console.error('Error creating order:', error);
        await fetchOrders(true);
        toast.error('حدث خطأ في إنشاء الطلب، حاول مرة أخرى');
        return null;
      }

      if (data?.error) {
        console.error('Server error:', data.error);
        await fetchOrders(true);
        toast.error(data.error);
        return null;
      }

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
        setTimeout(() => fetchOrders(true), 500);
      }

      return data.order;
    } catch (err) {
      console.error('Unexpected error creating order:', err);
      await fetchOrders(true);
      toast.error('حدث خطأ غير متوقع');
      return null;
    }
  };

  const updateOrderStatus = async (orderId: string, status: DbOrder['status']) => {
    setOrders(prev => prev.map(order => 
      order.id === orderId ? { ...order, status } : order
    ));

    const { error } = await supabase.from('orders').update({ status }).eq('id', orderId);

    if (error) {
      console.error('Error updating order status:', error);
      toast.error('حدث خطأ في تحديث حالة الطلب');
      fetchOrders();
      return false;
    }
    return true;
  };

  const assignDelivery = async (orderId: string, deliveryPersonId: string, deliveryPersonName: string) => {
    setOrders(prev => prev.map(order => 
      order.id === orderId 
        ? { ...order, delivery_person_id: deliveryPersonId, delivery_person_name: deliveryPersonName, pending_delivery_acceptance: true } 
        : order
    ));

    const { error } = await supabase.from('orders').update({
      delivery_person_id: deliveryPersonId,
      delivery_person_name: deliveryPersonName,
      pending_delivery_acceptance: true,
    }).eq('id', orderId);

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

  const acceptDelivery = async (orderId: string) => {
    setOrders(prev => prev.map(order => 
      order.id === orderId 
        ? { ...order, status: 'delivering' as const, pending_delivery_acceptance: false } 
        : order
    ));

    const { error } = await supabase.from('orders').update({ status: 'delivering', pending_delivery_acceptance: false }).eq('id', orderId);

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

  const rejectDelivery = async (orderId: string) => {
    setOrders(prev => prev.map(order => 
      order.id === orderId 
        ? { ...order, delivery_person_id: null, delivery_person_name: null, pending_delivery_acceptance: false, status: 'ready' as const } 
        : order
    ));

    const { error } = await supabase.from('orders').update({
      delivery_person_id: null,
      delivery_person_name: null,
      pending_delivery_acceptance: false,
      status: 'ready',
    }).eq('id', orderId);

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

  const returnOrder = async (orderId: string, reason?: string) => {
    const cancellationReason = reason || 'راجع';
    setOrders(prev => prev.map(order => 
      order.id === orderId 
        ? { ...order, status: 'cancelled' as const, cancellation_reason: cancellationReason } 
        : order
    ));

    const { error } = await supabase.from('orders').update({ status: 'cancelled', cancellation_reason: cancellationReason }).eq('id', orderId);

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

  const cancelOrder = async (orderId: string, reason?: string) => {
    setOrders(prev => prev.map(order => 
      order.id === orderId 
        ? { ...order, status: 'cancelled' as const, cancellation_reason: reason || null } 
        : order
    ));

    const { error } = await supabase.from('orders').update({ status: 'cancelled', cancellation_reason: reason || null }).eq('id', orderId);

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

  const getOrdersByStatus = (status: DbOrder['status'], orders: OrderWithItems[]) => {
    return orders.filter(o => o.status === status);
  };

  const updateOrder = async (orderId: string, orderData: {
    customer_name?: string;
    customer_phone?: string;
    customer_address?: string;
    delivery_area_id?: string;
    notes?: string;
    order_source?: string;
    items?: { menu_item_id?: string; menu_item_name: string; menu_item_price: number; quantity: number; notes?: string }[];
  }) => {
    try {
      const { data, error } = await invokeWithRetry(
        () => supabase.functions.invoke('update-order', {
          body: { order_id: orderId, ...orderData },
        }),
      );

      if (error) {
        console.error('Error updating order:', error);
        await fetchOrders(true);
        toast.error('حدث خطأ في تعديل الطلب');
        return null;
      }

      if (data?.error) {
        console.error('Server error:', data.error);
        await fetchOrders(true);
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

  const reportIssue = async (orderId: string, reason: string, reporterName: string) => {
    const { error } = await supabase
      .from('orders')
      .update({ 
        issue_reported: true,
        issue_reason: reason,
        issue_reported_by: reporterName,
        issue_reported_at: new Date().toISOString()
      })
      .eq('id', orderId);

    if (error) {
      console.error('Error reporting issue:', error);
      toast.error('حدث خطأ في تسجيل المشكلة');
      return false;
    }

    playNotificationSound('alert');
    toast.warning('تم تسجيل المشكلة', { id: `issue-${orderId}` });
    return true;
  };

  const resolveIssue = async (orderId: string) => {
    const { error } = await supabase
      .from('orders')
      .update({
        issue_reported: false,
        issue_reason: null,
        issue_reported_by: null,
        issue_reported_at: null,
      })
      .eq('id', orderId);

    if (error) {
      console.error('Error resolving issue:', error);
      toast.error('حدث خطأ في حل المشكلة');
      return false;
    }
    toast.success('تم حل المشكلة');
    return true;
  };

  return {
    addOrder,
    updateOrderStatus,
    assignDelivery,
    acceptDelivery,
    rejectDelivery,
    returnOrder,
    cancelOrder,
    getOrdersByStatus,
    updateOrder,
    reportIssue,
    resolveIssue,
  };
}
