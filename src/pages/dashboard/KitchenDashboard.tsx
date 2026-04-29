import { useEffect } from 'react';
import { RefreshCw, ChefHat, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSupabaseOrders } from '@/hooks/useSupabaseOrders';
import { useKitchenVoiceAnnouncer } from '@/hooks/useKitchenVoiceAnnouncer';
import { useArabicSpeech } from '@/hooks/useArabicSpeech';
import { KitchenOrderCard } from '@/components/KitchenOrderCard';
import { LogoutConfirmButton } from '@/components/LogoutConfirmButton';
import { ConnectionIndicator } from '@/components/shared/ConnectionIndicator';
import { BatchPrepBar } from '@/components/kitchen/BatchPrepBar';

export default function KitchenDashboard() {
  const { orders, loading, realtimeConnected, refetch } = useSupabaseOrders();
  const { audioUnlocked, unlockAudio, speak } = useArabicSpeech();

  // Arabic voice announcements - always on (no toggle)
  useKitchenVoiceAnnouncer(orders);

  // Auto-unlock on any user interaction anywhere on the page
  useEffect(() => {
    if (audioUnlocked) return;
    const handler = () => { unlockAudio(); };
    document.addEventListener('click', handler);
    document.addEventListener('touchstart', handler);
    document.addEventListener('keydown', handler);
    return () => {
      document.removeEventListener('click', handler);
      document.removeEventListener('touchstart', handler);
      document.removeEventListener('keydown', handler);
    };
  }, [audioUnlocked, unlockAudio]);

  // Filter preparing and pending orders, sort by oldest first
  const activeOrders = orders
    .filter(o => o.status === 'preparing' || o.status === 'pending')
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  return (
    <div className="flex flex-col h-dvh bg-background relative" dir="rtl">
      {/* Audio unlock overlay - mandatory tap to satisfy autoplay policy on TV/kiosk */}
      {!audioUnlocked && (
        <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur flex flex-col items-center justify-center gap-6 p-8">
          <div className="w-32 h-32 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
            <Volume2 className="w-20 h-20 text-primary" />
          </div>
          <h2 className="text-4xl font-black text-center">تفعيل الصوت</h2>
          <p className="text-xl text-muted-foreground text-center max-w-md">
            اضغط الزر أدناه لتفعيل التنبيهات الصوتية للمطبخ
          </p>
          <Button
            size="lg"
            className="text-2xl px-12 py-8 h-auto font-bold"
            onClick={async () => {
              await unlockAudio();
              // Speak a short test so the user confirms audio works
              speak('تم تفعيل التنبيهات الصوتية', 'audio-unlock-test', 60000);
            }}
          >
            <Volume2 className="w-8 h-8 ml-2" />
            اضغط لتفعيل الصوت
          </Button>
        </div>
      )}

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
