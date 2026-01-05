import { useState, useEffect, useMemo } from 'react';
import { useSupabaseOrders, OrderWithItems } from '@/hooks/useSupabaseOrders';
import { RefreshCw, StickyNote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { QuickAccessReturnButton } from '@/components/admin/QuickAccessReturnButton';

interface KitchenOrderCardProps {
  order: OrderWithItems;
}

const KitchenOrderCard = ({ order }: KitchenOrderCardProps) => {
  const hasOrderNotes = order.notes && order.notes.trim().length > 0;
  const hasItemNotes = order.items?.some(item => item.notes && item.notes.trim().length > 0);
  const hasAnyNotes = hasOrderNotes || hasItemNotes;
  
  const isPending = order.status === 'pending';
  const isDelivery = order.type === 'delivery';

  // Badge colors based on order type
  const badgeColor = isDelivery 
    ? 'bg-green-500 text-white'  // Green for delivery
    : 'bg-yellow-400 text-black'; // Yellow for takeaway

  const statusText = isDelivery 
    ? (isPending ? 'جديد +' : 'توصيل')
    : (isPending ? 'جديد +' : 'سفري');

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-4 flex flex-col h-full">
      {/* Top row - Number and Status badge */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {/* Order number */}
        <span className={`${badgeColor} px-3 py-1.5 rounded-md text-xl font-black`}>
          #{order.order_number}
        </span>
        
        {/* Status badge */}
        <span className={`${badgeColor} px-2 py-1 rounded-md text-sm font-bold`}>
          {statusText}
        </span>

        {/* Notes indicator */}
        {hasAnyNotes && (
          <StickyNote className="w-5 h-5 text-yellow-500 mr-auto" />
        )}
      </div>
      
      {/* Items list */}
      <div className="flex-1 space-y-1.5 overflow-hidden">
        {order.items?.map((item, index) => (
          <div key={index} className="flex items-start gap-2 text-base">
            <span className="text-gray-600 dark:text-gray-400 font-bold min-w-[2.5rem] text-right">
              ×{item.quantity}
            </span>
            <span className="font-medium text-gray-900 dark:text-gray-100 flex-1">
              {item.menu_item_name}
            </span>
            {item.notes && (
              <StickyNote className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
            )}
          </div>
        ))}
      </div>

      {/* Notes section if any */}
      {hasAnyNotes && (
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600 space-y-2">
          {hasOrderNotes && (
            <div className="bg-yellow-50 dark:bg-yellow-900/30 rounded p-2 text-sm">
              <span className="font-bold text-yellow-700 dark:text-yellow-400">ملاحظة: </span>
              <span className="text-gray-800 dark:text-gray-200">{order.notes}</span>
            </div>
          )}
          {order.items?.filter(item => item.notes).map((item, index) => (
            <div key={index} className="bg-gray-50 dark:bg-gray-700/50 rounded p-2 text-sm">
              <span className="font-bold text-gray-600 dark:text-gray-300">{item.menu_item_name}: </span>
              <span className="text-gray-800 dark:text-gray-200">{item.notes}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default function KitchenDashboard() {
  const { orders, refetch, loading } = useSupabaseOrders();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Update current time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Filter and sort orders - show all active orders
  const activeOrders = useMemo(() => {
    return orders
      .filter(order => 
        (order.status === 'pending' || order.status === 'preparing') && 
        (order.type === 'delivery' || order.type === 'takeaway')
      )
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, [orders]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setCurrentTime(new Date());
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const formatCurrentTime = () => {
    return currentTime.toLocaleTimeString('ar-SA', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  if (loading) {
    return (
      <div className="h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-2xl font-bold text-gray-800 dark:text-gray-200">جاري تحميل الطلبات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex flex-col" dir="rtl">
      <QuickAccessReturnButton />
      
      {/* Minimal Header */}
      <div className="h-14 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 bg-white dark:bg-gray-800 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-2xl font-black text-gray-800 dark:text-white">🍳 المطبخ</span>
          <span className="text-lg text-gray-500 dark:text-gray-400">
            {activeOrders.length} طلب نشط
          </span>
        </div>
        
        <div className="flex items-center gap-4">
          <span className="text-xl font-mono font-bold text-gray-800 dark:text-white">
            {formatCurrentTime()}
          </span>
          <Button
            onClick={handleRefresh}
            variant="outline"
            size="default"
            disabled={isRefreshing}
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            تحديث
          </Button>
        </div>
      </div>

      {/* Orders Grid - 4 columns with scroll */}
      <div className="flex-1 p-4 overflow-auto">
        {activeOrders.length === 0 ? (
          <div className="h-full flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <span className="text-6xl mb-4 block">✨</span>
              <p className="text-3xl font-bold text-gray-500 dark:text-gray-400">لا توجد طلبات نشطة</p>
              <p className="text-xl text-gray-400 dark:text-gray-500 mt-2">المطبخ فارغ</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {activeOrders.map((order) => (
              <KitchenOrderCard key={order.id} order={order} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
