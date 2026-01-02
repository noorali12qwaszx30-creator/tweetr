import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSupabaseOrders, OrderWithItems, DbOrderItem } from '@/hooks/useSupabaseOrders';
import { RefreshCw, StickyNote, Pencil, Clock, ChefHat } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { LogoutConfirmButton } from '@/components/LogoutConfirmButton';
import { QuickAccessReturnButton } from '@/components/admin/QuickAccessReturnButton';
interface KitchenOrderCardProps {
  order: OrderWithItems;
  isLate: boolean;
}

const KitchenOrderCard = ({ order, isLate }: KitchenOrderCardProps) => {
  const [isFlipped, setIsFlipped] = useState(false);
  
  // Check if order has notes
  const hasOrderNotes = order.notes && order.notes.trim().length > 0;
  const hasItemNotes = order.items.some(item => item.notes && item.notes.trim().length > 0);
  const hasAnyNotes = hasOrderNotes || hasItemNotes;
  
  // Check if order is edited
  const isEdited = order.is_edited === true;
  
  // Auto-flip for orders with notes every 5 seconds
  useEffect(() => {
    if (!hasAnyNotes) return;
    
    const interval = setInterval(() => {
      setIsFlipped(prev => !prev);
    }, 5000);
    
    return () => clearInterval(interval);
  }, [hasAnyNotes]);
  
  // Determine card background color based on priority
  const getCardClasses = () => {
    if (isLate) {
      return 'bg-red-100 border-red-500 animate-pulse dark:bg-red-900/50';
    }
    if (hasAnyNotes) {
      return 'bg-purple-50 border-purple-400 dark:bg-purple-900/30';
    }
    if (isEdited) {
      return 'bg-yellow-50 border-yellow-400 dark:bg-yellow-900/30';
    }
    if (order.type === 'takeaway') {
      return 'bg-amber-50 border-amber-400 dark:bg-amber-900/30';
    }
    return 'bg-blue-50 border-blue-300 dark:bg-blue-900/30';
  };

  return (
    <div className="kitchen-flip-card h-full" style={{ perspective: '1000px' }}>
      <div
        className={cn(
          'kitchen-flip-card-inner relative w-full h-full transition-transform duration-500',
          isFlipped && 'kitchen-flipped'
        )}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Front - Items */}
        <div
          className={cn(
            'absolute inset-0 rounded-2xl border-4 p-6 flex flex-col backface-hidden',
            getCardClasses()
          )}
          style={{ backfaceVisibility: 'hidden' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4 pb-4 border-b-2 border-current/20">
            <div className="flex items-center gap-4">
              <span className="text-5xl font-black text-foreground">
                #{order.order_number}
              </span>
              <span className={cn(
                'px-4 py-2 rounded-full text-2xl font-bold',
                order.type === 'takeaway' 
                  ? 'bg-amber-500 text-white' 
                  : 'bg-blue-500 text-white'
              )}>
                {order.type === 'takeaway' ? 'سفري' : 'دلفري'}
              </span>
            </div>
            <div className="flex items-center gap-3">
              {hasAnyNotes && (
                <StickyNote className="w-8 h-8 text-purple-600" />
              )}
              {isEdited && (
                <Pencil className="w-8 h-8 text-yellow-600" />
              )}
              {isLate && (
                <Clock className="w-8 h-8 text-red-600" />
              )}
            </div>
          </div>
          
          {/* Items List */}
          <div className="flex-1 overflow-auto space-y-3">
            {order.items.map((item, idx) => (
              <div 
                key={idx} 
                className="flex items-center gap-4 text-3xl font-semibold text-foreground"
              >
                <span className="bg-foreground/10 rounded-xl px-4 py-2 min-w-[80px] text-center font-black">
                  {item.quantity}x
                </span>
                <span className="flex-1">{item.menu_item_name}</span>
                {item.notes && (
                  <StickyNote className="w-6 h-6 text-purple-500 flex-shrink-0" />
                )}
              </div>
            ))}
          </div>
        </div>
        
        {/* Back - Notes */}
        <div
          className={cn(
            'absolute inset-0 rounded-2xl border-4 p-6 flex flex-col backface-hidden',
            'bg-purple-100 border-purple-500 dark:bg-purple-900/50'
          )}
          style={{ 
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)'
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4 pb-4 border-b-2 border-purple-300">
            <div className="flex items-center gap-4">
              <StickyNote className="w-10 h-10 text-purple-600" />
              <span className="text-4xl font-black text-purple-800 dark:text-purple-200">
                ملاحظات الطلب #{order.order_number}
              </span>
            </div>
          </div>
          
          {/* Notes Content */}
          <div className="flex-1 overflow-auto space-y-4">
            {/* Order Notes */}
            {hasOrderNotes && (
              <div className="bg-white/50 dark:bg-black/20 rounded-xl p-4">
                <p className="text-2xl font-bold text-purple-700 dark:text-purple-300 mb-2">
                  📋 ملاحظة عامة:
                </p>
                <p className="text-3xl font-semibold text-foreground">
                  {order.notes}
                </p>
              </div>
            )}
            
            {/* Item Notes */}
            {order.items.filter(item => item.notes).map((item, idx) => (
              <div key={idx} className="bg-white/50 dark:bg-black/20 rounded-xl p-4">
                <p className="text-2xl font-bold text-purple-700 dark:text-purple-300 mb-2">
                  🍔 {item.menu_item_name}:
                </p>
                <p className="text-3xl font-semibold text-foreground">
                  {item.notes}
                </p>
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
  
  // Update current time every minute to check for late orders
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Every minute
    
    return () => clearInterval(interval);
  }, []);
  
  // Filter orders: only "preparing" status for delivery and takeaway
  const preparingOrders = useMemo(() => {
    return orders
      .filter(order => 
        order.status === 'preparing' && 
        (order.type === 'delivery' || order.type === 'takeaway')
      )
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()); // Oldest first
  }, [orders]);
  
  // Check if order is late (more than 20 minutes)
  const isOrderLate = useCallback((order: OrderWithItems) => {
    const orderTime = new Date(order.created_at).getTime();
    const now = currentTime.getTime();
    const diffMinutes = (now - orderTime) / (1000 * 60);
    return diffMinutes > 20;
  }, [currentTime]);
  
  // Manual refresh handler
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setCurrentTime(new Date());
    setTimeout(() => setIsRefreshing(false), 500);
  };
  
  return (
    <div className="min-h-screen bg-background p-6" dir="rtl">
      <QuickAccessReturnButton />
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center">
            <ChefHat className="w-10 h-10 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-4xl font-black text-foreground">شاشة المطبخ</h1>
            <p className="text-xl text-muted-foreground">
              الطلبات قيد التجهيز: {preparingOrders.length}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <Button
            onClick={handleRefresh}
            size="lg"
            className="h-16 px-8 text-2xl font-bold gap-3"
            disabled={isRefreshing}
          >
            <RefreshCw className={cn('w-8 h-8', isRefreshing && 'animate-spin')} />
            تحديث
          </Button>
          <LogoutConfirmButton />
        </div>
      </div>
      
      {/* Orders Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-[70vh]">
          <div className="text-center">
            <RefreshCw className="w-16 h-16 animate-spin text-primary mx-auto mb-4" />
            <p className="text-2xl text-muted-foreground">جاري التحميل...</p>
          </div>
        </div>
      ) : preparingOrders.length === 0 ? (
        <div className="flex items-center justify-center h-[70vh]">
          <div className="text-center">
            <ChefHat className="w-24 h-24 text-muted-foreground/30 mx-auto mb-6" />
            <p className="text-4xl font-bold text-muted-foreground">لا توجد طلبات حالياً</p>
            <p className="text-2xl text-muted-foreground/70 mt-2">المطبخ فارغ</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {preparingOrders.map(order => (
            <div key={order.id} className="h-[400px]">
              <KitchenOrderCard 
                order={order} 
                isLate={isOrderLate(order)}
              />
            </div>
          ))}
        </div>
      )}
      
      {/* Legend */}
      <div className="fixed bottom-6 left-6 right-6 bg-card/90 backdrop-blur-sm border rounded-2xl p-4">
        <div className="flex items-center justify-center gap-8 text-lg font-medium">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-blue-400" />
            <span>دلفري</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-amber-400" />
            <span>سفري</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-purple-400" />
            <span>ملاحظات</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-yellow-400" />
            <span>معدّل</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-red-500 animate-pulse" />
            <span>متأخر (+20 دقيقة)</span>
          </div>
        </div>
      </div>
    </div>
  );
}