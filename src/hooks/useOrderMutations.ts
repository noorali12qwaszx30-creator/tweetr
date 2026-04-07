// Order CRUD mutation operations
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { DbOrder, OrderWithItems } from './useSupabaseOrders';

interface UseOrderMutationsProps {
  setOrders: React.Dispatch<React.SetStateAction<OrderWithItems[]>>;
  fetchOrders: (silent?: boolean) => Promise<void>;
  playNotificationSound: (sound: any) => void;
}

export function useOrderMutations({ setOrders, fetchOrders, playNotificationSound }: UseOrderMutationsProps) {
  
  const addOrder = async (orderData: {
    customer_name: string;
    customer_phone: string;
    customer_address?: string;
    delivery_area_id?: string;
    type: 'delivery' | 'takeaway';
    notes?: string;
    cashier_id?: string;
    cashier_name?: string;
    order_source?: string;
    items: { menu_item_id?: string; menu_item_name: string; menu_item_price: number; quantity: number; notes?: string }[];
  }) => {
    try {
      const { data, error } = await supabase.functions.invoke('create-order', { body: orderData });

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

  const reportIssue = async (orderId: string, reason: string, reporterName: string) => {
    setOrders(prev => prev.map(order => 
      order.id === orderId 
        ? { ...order, has_issue: true, issue_reason: reason, issue_reported_at: new Date().toISOString(), issue_reported_by: reporterName } 
        : order
    ));

    const { error } = await supabase.from('orders').update({
      has_issue: true,
      issue_reason: reason,
      issue_reported_at: new Date().toISOString(),
      issue_reported_by: reporterName,
    }).eq('id', orderId);

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

  const resolveIssue = async (orderId: string) => {
    setOrders(prev => prev.map(order => 
      order.id === orderId 
        ? { ...order, has_issue: false, issue_reason: null, issue_reported_at: null, issue_reported_by: null } 
        : order
    ));

    const { error } = await supabase.from('orders').update({
      has_issue: false,
      issue_reason: null,
      issue_reported_at: null,
      issue_reported_by: null,
    }).eq('id', orderId);

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
  };
}
