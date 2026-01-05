import { useState, useEffect, useMemo } from 'react';
import { useSupabaseOrders, OrderWithItems } from '@/hooks/useSupabaseOrders';
import { RefreshCw, StickyNote, Truck, ShoppingBag, Clock } from 'lucide-react';
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

  const formatTime = () => {
    const mins = String(elapsedTime.minutes).padStart(2, '0');
    const secs = String(elapsedTime.seconds).padStart(2, '0');
    return `${mins}:${secs}`;
  };

  // Timer colors based on elapsed time
  const getTimerColors = () => {
    if (elapsedTime.minutes < 10) {
      return {
        bg: 'bg-green-100 dark:bg-green-900/50',
        border: 'border-green-500',
        text: 'text-green-700 dark:text-green-300',
        progress: 'bg-green-500',
        pulse: ''
      };
    } else if (elapsedTime.minutes < 15) {
      return {
        bg: 'bg-yellow-100 dark:bg-yellow-900/50',
        border: 'border-yellow-500',
        text: 'text-yellow-700 dark:text-yellow-300',
        progress: 'bg-yellow-500',
        pulse: ''
      };
    } else {
      return {
        bg: 'bg-red-100 dark:bg-red-900/50',
        border: 'border-red-500',
        text: 'text-red-700 dark:text-red-300',
        progress: 'bg-red-500',
        pulse: 'animate-pulse'
      };
    }
  };

  // Card colors based on order type
  const cardColors = isDelivery
    ? {
        header: 'bg-blue-600 dark:bg-blue-700',
        body: 'bg-blue-50 dark:bg-blue-950',
        border: 'border-blue-500',
        iconBg: 'bg-blue-700 dark:bg-blue-800',
        pendingGlow: isPending ? 'ring-4 ring-green-400 ring-opacity-75' : ''
      }
    : {
        header: 'bg-orange-600 dark:bg-orange-700',
        body: 'bg-orange-50 dark:bg-orange-950',
        border: 'border-orange-500',
        iconBg: 'bg-orange-700 dark:bg-orange-800',
        pendingGlow: isPending ? 'ring-4 ring-green-400 ring-opacity-75' : ''
      };

  const timerColors = getTimerColors();
  const progressPercent = Math.min(100, (elapsedTime.minutes / 15) * 100);

  return (
    <div className="h-full w-full" style={{ perspective: '1000px' }}>
      <div 
        className="relative w-full h-full transition-transform duration-700"
        style={{ 
          transformStyle: 'preserve-3d',
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
        }}
      >
        {/* Front Face */}
        <div 
          className={`absolute inset-0 rounded-lg border-2 ${cardColors.border} ${cardColors.body} shadow-lg flex flex-col overflow-hidden ${cardColors.pendingGlow}`}
          style={{ backfaceVisibility: 'hidden' }}
        >
          {/* Header - Ultra Compact */}
          <div className={`${cardColors.header} text-white px-1.5 py-0.5 flex items-center justify-between shrink-0`}>
            <span className="text-xs font-bold">#{order.order_number}</span>
            <div className="flex items-center gap-0.5">
              {/* Type icon */}
              {isDelivery ? (
                <Truck className="w-2.5 h-2.5" />
              ) : (
                <ShoppingBag className="w-2.5 h-2.5" />
              )}
              {/* Status badge */}
              <span className={`px-0.5 rounded text-[8px] font-bold ${
                isPending ? 'bg-green-500' : 'bg-white/20'
              }`}>
                {isPending ? 'جديد' : 'تجهيز'}
              </span>
              {/* Notes indicator */}
              {hasAnyNotes && (
                <StickyNote className="w-2.5 h-2.5 text-yellow-300" />
              )}
            </div>
          </div>

          {/* Items list - compact with more items */}
          <div className="flex-1 px-1.5 py-1 overflow-hidden min-h-0">
            <div className="space-y-0">
              {order.items?.slice(0, 12).map((item, index) => (
                <div key={index} className="flex items-center gap-1 leading-tight">
                  <span className="text-xs font-black text-primary min-w-[1.2rem]">
                    {item.quantity}×
                  </span>
                  <span className="text-[11px] font-semibold truncate flex-1">
                    {item.menu_item_name}
                  </span>
                  {item.notes && (
                    <StickyNote className="w-2 h-2 text-yellow-500 flex-shrink-0" />
                  )}
                </div>
              ))}
              {order.items && order.items.length > 12 && (
                <div className="text-[10px] text-muted-foreground text-center">
                  +{order.items.length - 12} أخرى
                </div>
              )}
            </div>
          </div>

          {/* Timer - compact */}
          <div className={`mx-1 mb-1 p-1 rounded-lg border shadow-inner shrink-0
            ${timerColors.bg} ${timerColors.border} ${timerColors.pulse}`}>
            <div className={`flex items-center justify-center gap-1 ${timerColors.text}`}>
              <Clock className="w-3 h-3" />
              <span className="text-sm font-black font-mono">{formatTime()}</span>
            </div>
            {/* Progress bar */}
            <div className="mt-0.5 h-1 bg-white/50 dark:bg-black/30 rounded-full overflow-hidden">
              <div
                className={`h-full ${timerColors.progress} transition-all duration-1000`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Back Face - Notes */}
        <div 
          className={`absolute inset-0 rounded-lg border-2 ${cardColors.border} ${cardColors.body} shadow-lg flex flex-col overflow-hidden`}
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
        >
          {/* Header */}
          <div className={`${cardColors.header} text-white px-2 py-1 flex items-center justify-between shrink-0`}>
            <span className="text-sm font-black">#{order.order_number}</span>
            <StickyNote className="w-3 h-3 text-yellow-300" />
          </div>
          
          {/* Notes content */}
          <div className="flex-1 px-1.5 py-1 overflow-auto min-h-0 space-y-1">
            {hasOrderNotes && (
              <div className="bg-yellow-100 dark:bg-yellow-900/50 rounded p-1">
                <div className="text-[10px] font-bold text-yellow-700 dark:text-yellow-300">
                  ملاحظات:
                </div>
                <div className="text-[11px] font-medium">{order.notes}</div>
              </div>
            )}
            {order.items?.filter(item => item.notes).map((item, index) => (
              <div key={index} className="bg-white/50 dark:bg-black/20 rounded p-1">
                <div className="text-[10px] font-bold text-primary">
                  {item.menu_item_name}:
                </div>
                <div className="text-[11px]">{item.notes}</div>
              </div>
            ))}
          </div>

          {/* Timer */}
          <div className={`mx-1 mb-1 p-1 rounded-lg border shadow-inner shrink-0
            ${timerColors.bg} ${timerColors.border} ${timerColors.pulse}`}>
            <div className={`flex items-center justify-center gap-1 ${timerColors.text}`}>
              <Clock className="w-3 h-3" />
              <span className="text-sm font-black font-mono">{formatTime()}</span>
            </div>
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

  // Filter and sort orders - show 18 orders (3 rows × 6 columns)
  const activeOrders = useMemo(() => {
    return orders
      .filter(order => 
        (order.status === 'pending' || order.status === 'preparing') && 
        (order.type === 'delivery' || order.type === 'takeaway')
      )
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .slice(0, 18);
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

      {/* Orders Grid - 3 rows × 6 columns with portrait cards */}
      <div className="flex-1 p-3 min-h-0">
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
            className="grid gap-3 h-full"
            style={{
              gridTemplateColumns: 'repeat(6, 1fr)',
              gridTemplateRows: 'repeat(3, 1fr)',
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
