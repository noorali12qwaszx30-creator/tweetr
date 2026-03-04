import { useState, useEffect, useRef, useCallback } from 'react';
import { RefreshCw, ChefHat } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useSupabaseOrders, OrderWithItems } from '@/hooks/useSupabaseOrders';
import { OrderTimer } from '@/components/OrderTimer';
import { LogoutConfirmButton } from '@/components/LogoutConfirmButton';
import { ConnectionIndicator } from '@/components/shared/ConnectionIndicator';
import { toEnglishNumbers } from '@/lib/formatNumber';

// Kitchen alarm hook - plays urgent alarm when any order exceeds 30 minutes
function useKitchenAlarm(orders: OrderWithItems[]) {
  const alarmIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const [alarmActive, setAlarmActive] = useState(false);

  const playAlarmBeep = useCallback(() => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'square';
      osc.frequency.setValueAtTime(900, ctx.currentTime);
      osc.frequency.setValueAtTime(600, ctx.currentTime + 0.1);
      osc.frequency.setValueAtTime(900, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.35, ctx.currentTime);
      gain.gain.setValueAtTime(0, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.35, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.35, ctx.currentTime + 0.24);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.4);
    } catch {}
  }, []);

  useEffect(() => {
    const checkAlarm = () => {
      const now = Date.now();
      const hasLateOrder = orders.some(o => {
        if (o.status !== 'preparing' && o.status !== 'pending') return false;
        const created = new Date(o.created_at.endsWith('Z') || o.created_at.includes('+') ? o.created_at : o.created_at + 'Z');
        return (now - created.getTime()) / 1000 >= 1800; // 30 min
      });
      setAlarmActive(hasLateOrder);
    };

    checkAlarm();
    const check = setInterval(checkAlarm, 5000);
    return () => clearInterval(check);
  }, [orders]);

  useEffect(() => {
    if (alarmActive) {
      playAlarmBeep();
      alarmIntervalRef.current = setInterval(playAlarmBeep, 8000);
    } else if (alarmIntervalRef.current) {
      clearInterval(alarmIntervalRef.current);
      alarmIntervalRef.current = null;
    }
    return () => {
      if (alarmIntervalRef.current) clearInterval(alarmIntervalRef.current);
    };
  }, [alarmActive, playAlarmBeep]);
}

// Kitchen order card component - optimized for large display
function KitchenOrderCard({ order }: { order: OrderWithItems }) {
  return (
    <Card className={`border-2 hover:border-primary/30 transition-colors h-full flex flex-col overflow-hidden ${
      order.type === 'delivery' 
        ? 'bg-info/5 border-info/40' 
        : 'bg-success/5 border-success/40'
    }`}>
      {/* Unified top bar */}
      <div className={`flex items-center justify-between px-2 py-1.5 shrink-0 ${
        order.type === 'delivery' 
          ? 'bg-info/40 border-b-2 border-info' 
          : 'bg-success/40 border-b-2 border-success'
      }`}>
        <div className="flex items-center gap-1 min-w-0">
          <span className="text-sm font-black text-primary whitespace-nowrap">
            #{toEnglishNumbers(order.order_number.toString())}
          </span>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap ${
            order.type === 'delivery' ? 'bg-info/30 text-info' : 'bg-success/30 text-success'
          }`}>
            {order.type === 'delivery' ? 'توصيل' : 'سفري'}
          </span>
        </div>
        <OrderTimer startTime={order.created_at} />
      </div>
      
      {/* Items list */}
      <ul className="space-y-0.5 flex-1 p-2 overflow-auto">
        {order.items.map(item => (
          <li key={item.id} className="text-sm">
            <div className="flex items-start gap-1">
              <div className="flex-1">
                <span className="font-bold text-foreground text-base">{item.menu_item_name}</span>
                <span className="font-black text-primary mr-1">
                  ×{toEnglishNumbers(item.quantity.toString())}
                </span>
                {item.notes && (
                  <p className="text-warning text-[10px] mt-0.5 font-medium">
                    ⚠️ {item.notes}
                  </p>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
      
      {/* Order notes */}
      {order.notes && (
        <div className="mx-2 mb-2 p-1.5 bg-warning/10 border border-warning/30 rounded shrink-0">
          <p className="text-warning text-[10px] font-bold">
            ⚠️ {order.notes}
          </p>
        </div>
      )}
    </Card>
  );
}

export default function KitchenDashboard() {
  const { orders, loading, realtimeConnected, refetch } = useSupabaseOrders();
  
  // Activate kitchen alarm for orders > 30 min
  useKitchenAlarm(orders);
  // Filter preparing and pending orders, sort by oldest first
  const activeOrders = orders
    .filter(o => o.status === 'preparing' || o.status === 'pending')
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Header */}
      <header className="bg-card border-b-2 border-border shadow-lg sticky top-0 z-50">
        <div className="container flex items-center justify-between h-20 px-6">
          {/* Refresh button */}
          <Button 
            onClick={() => refetch()} 
            variant="outline" 
            size="lg"
            className="gap-3 text-lg font-bold h-14 px-6"
          >
            <RefreshCw className="w-6 h-6" />
            تحديث
          </Button>
          
          {/* Title */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-primary flex items-center justify-center">
              <ChefHat className="w-8 h-8 text-primary-foreground" />
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-black text-foreground">
                المطبخ - قيد التجهيز
              </h1>
              <p className="text-3xl font-black text-primary">
                ({toEnglishNumbers(activeOrders.length.toString())})
              </p>
            </div>
            <ConnectionIndicator connected={realtimeConnected} />
          </div>
          
          {/* Logout button */}
          <LogoutConfirmButton variant="compact" />
        </div>
      </header>

      {/* Main content */}
      <main className="container p-3">
        {loading ? (
          <div className="flex items-center justify-center h-[60vh]">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
              <p className="text-xl text-muted-foreground">جاري تحميل الطلبات...</p>
            </div>
          </div>
        ) : activeOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[60vh] text-center">
            <div className="w-32 h-32 rounded-full bg-muted flex items-center justify-center mb-6">
              <ChefHat className="w-16 h-16 text-muted-foreground" />
            </div>
            <h2 className="text-3xl font-bold text-muted-foreground mb-2">
              لا توجد طلبات قيد التجهيز
            </h2>
            <p className="text-xl text-muted-foreground">
              ستظهر الطلبات الجديدة هنا تلقائياً
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-6 gap-3 auto-rows-[calc((100vh-6rem)/3)]">
            {activeOrders.map(order => (
              <KitchenOrderCard key={order.id} order={order} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
