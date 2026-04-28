import { useEffect } from 'react';
import { RefreshCw, ChefHat } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSupabaseOrders } from '@/hooks/useSupabaseOrders';
import { useKitchenVoiceAnnouncer } from '@/hooks/useKitchenVoiceAnnouncer';
import { KitchenOrderCard } from '@/components/KitchenOrderCard';
import { LogoutConfirmButton } from '@/components/LogoutConfirmButton';
import { ConnectionIndicator } from '@/components/shared/ConnectionIndicator';
import { BatchPrepBar } from '@/components/kitchen/BatchPrepBar';

export default function KitchenDashboard() {
  const { orders, loading, realtimeConnected, refetch } = useSupabaseOrders();

  // Arabic voice announcements - always on (no toggle)
  useKitchenVoiceAnnouncer(orders);

  // Unlock audio playback on first user interaction (browser autoplay policy)
  useEffect(() => {
    const unlock = () => {
      try {
        const a = new Audio();
        a.play().catch(() => {});
      } catch {}
      document.removeEventListener('click', unlock);
      document.removeEventListener('touchstart', unlock);
      document.removeEventListener('keydown', unlock);
    };
    document.addEventListener('click', unlock, { once: true });
    document.addEventListener('touchstart', unlock, { once: true });
    document.addEventListener('keydown', unlock, { once: true });
    return () => {
      document.removeEventListener('click', unlock);
      document.removeEventListener('touchstart', unlock);
      document.removeEventListener('keydown', unlock);
    };
  }, []);

  // Filter preparing and pending orders, sort by oldest first
  const activeOrders = orders
    .filter(o => o.status === 'preparing' || o.status === 'pending')
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  return (
    <div className="flex flex-col h-dvh bg-background relative" dir="rtl">
      {/* Floating compact controls */}
      <div className="absolute top-2 left-2 z-50 flex items-center gap-2">
        <ConnectionIndicator connected={realtimeConnected} />
        <Button
          onClick={() => refetch()}
          variant="outline"
          size="sm"
          className="gap-1 text-xs px-3 py-1.5 h-auto shadow-md bg-card/95 backdrop-blur"
        >
          <RefreshCw className="w-4 h-4" />
          تحديث
        </Button>
        <LogoutConfirmButton variant="compact" />
      </div>

      {/* Batch prep summary bar (replaces header) */}
      <BatchPrepBar orders={activeOrders} />

      {/* Main content */}
      <main className="container p-3 flex-1 overflow-auto">
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
