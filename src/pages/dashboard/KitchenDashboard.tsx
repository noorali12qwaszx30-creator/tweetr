import { useState, useEffect, useMemo } from 'react';
import { useSupabaseOrders, OrderWithItems } from '@/hooks/useSupabaseOrders';
import { RefreshCw, StickyNote, Truck, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { QuickAccessReturnButton } from '@/components/admin/QuickAccessReturnButton';

interface KitchenOrderCardProps {
  order: OrderWithItems;
}

const KitchenOrderCard = ({ order }: KitchenOrderCardProps) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [elapsedTime, setElapsedTime] = useState({ minutes: 0, seconds: 0 });
  
  const hasOrderNotes = order.notes && order.notes.trim().length > 0;
  const hasItemNotes = order.items?.some(item => item.notes && item.notes.trim().length > 0);
  const hasAnyNotes = hasOrderNotes || hasItemNotes;
  
  const isPending = order.status === 'pending';
  const isDelivery = order.type === 'delivery';

  // Calculate elapsed time
  useEffect(() => {
    const calculateElapsed = () => {
      const created = new Date(order.created_at).getTime();
      const now = Date.now();
      const diffMs = now - created;
      const totalSeconds = Math.floor(diffMs / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      setElapsedTime({ minutes, seconds });
    };

    calculateElapsed();
    const interval = setInterval(calculateElapsed, 1000);
    return () => clearInterval(interval);
  }, [order.created_at]);

  // Auto-flip for orders with notes every 6 seconds
  useEffect(() => {
    if (!hasAnyNotes) return;
    
    const flipInterval = setInterval(() => {
      setIsFlipped(prev => !prev);
    }, 6000);

    return () => clearInterval(flipInterval);
  }, [hasAnyNotes]);

  const getTimerColor = () => {
    if (elapsedTime.minutes < 10) return 'text-green-500';
    if (elapsedTime.minutes < 15) return 'text-yellow-500';
    return 'text-red-500';
  };

  const formatTime = () => {
    const mins = String(elapsedTime.minutes).padStart(2, '0');
    const secs = String(elapsedTime.seconds).padStart(2, '0');
    return `${mins}:${secs}`;
  };

  const getCardBorderColor = () => {
    if (isPending) return 'border-green-500';
    return 'border-blue-400';
  };

  return (
    <div className="h-full w-full" style={{ perspective: '1000px' }}>
      <div 
        className={`relative w-full h-full transition-transform duration-700 ${isFlipped ? '' : ''}`}
        style={{ 
          transformStyle: 'preserve-3d',
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
        }}
      >
        {/* Front Face */}
        <div 
          className={`absolute inset-0 rounded-lg border-4 ${getCardBorderColor()} bg-card shadow-sm flex flex-col overflow-hidden`}
          style={{ backfaceVisibility: 'hidden' }}
        >
          {/* Header Row */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-border/50 shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-3xl font-black text-foreground">
                #{order.order_number}
              </span>
              {/* Type indicator */}
              <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                isDelivery ? 'bg-blue-500' : 'bg-orange-500'
              }`}>
                {isDelivery ? (
                  <Truck className="w-4 h-4 text-white" />
                ) : (
                  <ShoppingBag className="w-4 h-4 text-white" />
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {hasAnyNotes && (
                <StickyNote className="w-5 h-5 text-purple-500 shrink-0" />
              )}
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold shrink-0 ${
                isPending 
                  ? 'bg-green-500 text-white' 
                  : 'bg-blue-500 text-white'
              }`}>
                {isPending ? 'جديد' : 'قيد التجهيز'}
              </span>
            </div>
          </div>

          {/* Items List */}
          <div className="flex-1 px-3 py-2 overflow-hidden min-h-0">
            <div className="space-y-0.5">
              {order.items?.slice(0, 5).map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="text-lg font-bold text-primary min-w-[32px]">
                    {item.quantity}×
                  </span>
                  <span className="text-base font-semibold text-foreground truncate">
                    {item.menu_item_name}
                  </span>
                </div>
              ))}
              {order.items && order.items.length > 5 && (
                <div className="text-muted-foreground text-xs font-medium">
                  +{order.items.length - 5} أصناف أخرى
                </div>
              )}
            </div>
          </div>

          {/* Timer */}
          <div className={`px-3 py-2 border-t border-border/50 text-center shrink-0 ${getTimerColor()}`}>
            <span className="text-2xl font-bold font-mono">
              ⏱️ {formatTime()}
            </span>
          </div>
        </div>

        {/* Back Face - Notes */}
        <div 
          className="absolute inset-0 rounded-lg border-4 border-purple-500 bg-purple-50 dark:bg-purple-900/30 shadow-sm flex flex-col overflow-hidden"
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
        >
          <div className="flex items-center justify-between px-3 py-2 border-b border-purple-300 dark:border-purple-700 shrink-0">
            <span className="text-3xl font-black text-foreground">
              #{order.order_number}
            </span>
            <StickyNote className="w-6 h-6 text-purple-600" />
          </div>
          
          <div className="flex-1 px-3 py-2 overflow-auto min-h-0">
            <h3 className="text-lg font-bold text-purple-700 dark:text-purple-300 mb-2">
              📝 ملاحظات
            </h3>
            {order.notes && (
              <div className="mb-2 p-2 bg-purple-100 dark:bg-purple-800/50 rounded-lg">
                <p className="text-sm font-semibold text-foreground">{order.notes}</p>
              </div>
            )}
            {order.items?.filter(item => item.notes).map((item, index) => (
              <div key={index} className="mb-1 p-1.5 bg-white/50 dark:bg-black/20 rounded text-sm">
                <span className="font-bold text-primary">{item.menu_item_name}: </span>
                <span className="text-foreground">{item.notes}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
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

  // Filter and sort orders - show first 16 only
  const activeOrders = useMemo(() => {
    return orders
      .filter(order => 
        (order.status === 'pending' || order.status === 'preparing') && 
        (order.type === 'delivery' || order.type === 'takeaway')
      )
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .slice(0, 16);
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
      <div className="h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-2xl font-bold text-foreground">جاري تحميل الطلبات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden" dir="rtl">
      <QuickAccessReturnButton />
      
      {/* Minimal Header */}
      <div className="h-14 border-b border-border flex items-center justify-between px-4 bg-card shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-2xl font-black text-foreground">🍳 المطبخ</span>
          <span className="text-lg text-muted-foreground">
            {activeOrders.length} طلب نشط
          </span>
        </div>
        
        <div className="flex items-center gap-4">
          <span className="text-xl font-mono font-bold text-foreground">
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

      {/* Orders Grid - 4x4 */}
      <div className="flex-1 p-2 min-h-0">
        {activeOrders.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <span className="text-6xl mb-4 block">✨</span>
              <p className="text-3xl font-bold text-muted-foreground">لا توجد طلبات نشطة</p>
              <p className="text-xl text-muted-foreground/70 mt-2">المطبخ فارغ</p>
            </div>
          </div>
        ) : (
          <div 
            className="grid gap-2 h-full"
            style={{
              gridTemplateColumns: 'repeat(4, 1fr)',
              gridTemplateRows: `repeat(4, 1fr)`,
            }}
          >
            {activeOrders.map((order) => (
              <KitchenOrderCard key={order.id} order={order} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
