import { useEffect, useMemo, useState } from 'react';
import { RefreshCw, ChefHat, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSupabaseOrders } from '@/hooks/useSupabaseOrders';
import { useKitchenVoiceAnnouncer } from '@/hooks/useKitchenVoiceAnnouncer';
import { useLateOrderSiren } from '@/hooks/useLateOrderSiren';
import { useArabicSpeech } from '@/hooks/useArabicSpeech';
import { KitchenOrderCard } from '@/components/KitchenOrderCard';
import { LogoutConfirmButton } from '@/components/LogoutConfirmButton';
import { ConnectionIndicator } from '@/components/shared/ConnectionIndicator';
import { BatchPrepBar } from '@/components/kitchen/BatchPrepBar';
import { Capacitor } from '@capacitor/core';
import { KeepAwake } from '@capacitor-community/keep-awake';

export default function KitchenDashboard() {
  const { orders, loading, realtimeConnected, refetch } = useSupabaseOrders({
    statusIn: ['pending', 'preparing', 'ready'],
  });
  const { audioUnlocked, unlockAudio, speak } = useArabicSpeech();

  // Arabic voice announcements - always on (no toggle)
  useKitchenVoiceAnnouncer(orders);

  // Loud 6-second siren when an order crosses 30 minutes (once per order)
  useLateOrderSiren(orders, audioUnlocked);

  // On native Android (kiosk install) the device TTS is always ready —
  // auto-unlock so the "tap to enable sound" overlay never appears.
  useEffect(() => {
    if (Capacitor.isNativePlatform() && !audioUnlocked) {
      unlockAudio();
    }
  }, [audioUnlocked, unlockAudio]);

  // Keep the kitchen screen always on (no sleep/dim).
  useEffect(() => {
    let wakeLock: any = null;
    let released = false;

    const enable = async () => {
      if (Capacitor.isNativePlatform()) {
        try { await KeepAwake.keepAwake(); } catch (e) { console.warn('[KeepAwake] native failed', e); }
      } else if ('wakeLock' in navigator) {
        try {
          // @ts-ignore
          wakeLock = await navigator.wakeLock.request('screen');
        } catch (e) { console.warn('[WakeLock] web failed', e); }
      }
    };

    enable();

    // Re-acquire on tab visibility change (browser releases wake lock on hide)
    const onVisible = () => {
      if (document.visibilityState === 'visible' && !released) enable();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      released = true;
      document.removeEventListener('visibilitychange', onVisible);
      if (Capacitor.isNativePlatform()) {
        KeepAwake.allowSleep().catch(() => {});
      } else if (wakeLock) {
        try { wakeLock.release(); } catch {}
      }
    };
  }, []);

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

  // Auto-rotate pages when orders exceed grid capacity (6x3 = 18)
  const ORDERS_PER_PAGE = 18;
  const ROTATION_MS = 8000;
  const pages = useMemo(() => {
    const out: typeof activeOrders[] = [];
    for (let i = 0; i < activeOrders.length; i += ORDERS_PER_PAGE) {
      out.push(activeOrders.slice(i, i + ORDERS_PER_PAGE));
    }
    return out.length ? out : [[]];
  }, [activeOrders]);
  const totalPages = pages.length;
  const [currentPage, setCurrentPage] = useState(0);

  useEffect(() => {
    if (currentPage >= totalPages) setCurrentPage(0);
  }, [totalPages, currentPage]);

  useEffect(() => {
    if (totalPages <= 1) return;
    const id = setInterval(() => {
      setCurrentPage(p => (p + 1) % totalPages);
    }, ROTATION_MS);
    return () => clearInterval(id);
  }, [totalPages]);

  const visibleOrders = pages[Math.min(currentPage, totalPages - 1)] ?? [];

  return (
    <div className="flex flex-col h-dvh kitchen-bg relative" dir="rtl">
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
          className="gap-1 text-xs px-3 py-1.5 h-auto rounded-xl border-border/60 kitchen-glass"
        >
          <RefreshCw className="w-4 h-4" />
          تحديث
        </Button>
        <LogoutConfirmButton variant="compact" />
      </div>

      {/* Batch prep summary bar (replaces header) */}
      <BatchPrepBar orders={activeOrders} />

      {totalPages > 1 && (
        <div className="px-3 pt-1 flex items-center justify-center gap-2 text-[11px] font-bold text-muted-foreground">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/30">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            صفحة {currentPage + 1} / {totalPages} • تدوير تلقائي
          </span>
        </div>
      )}

      {/* Main content */}
      <main className="container p-3 flex-1 overflow-hidden">
        {loading ? (
          <div className="grid grid-cols-6 gap-3 auto-rows-[calc((100vh-6rem)/3)]">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl border border-border/40 kitchen-glass overflow-hidden animate-pulse"
              >
                <div className="h-10 bg-muted/40" />
                <div className="p-3 space-y-2">
                  <div className="h-3 rounded bg-muted/50 w-3/4" />
                  <div className="h-3 rounded bg-muted/40 w-1/2" />
                  <div className="h-3 rounded bg-muted/40 w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : activeOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[60vh] text-center">
            <div className="relative mb-6">
              <div className="absolute inset-0 rounded-full bg-primary/20 blur-2xl" />
              <div className="relative w-32 h-32 rounded-full kitchen-glass border border-border/60 flex items-center justify-center shadow-elevated">
                <ChefHat className="w-16 h-16 text-primary" />
              </div>
            </div>
            <h2 className="text-2xl font-black text-foreground mb-2">
              المطبخ هادئ الآن
            </h2>
            <p className="text-base text-muted-foreground">
              ستظهر الطلبات الجديدة هنا تلقائياً
            </p>
          </div>
        ) : (
          <div
            key={currentPage}
            className="grid grid-cols-6 gap-3 auto-rows-[calc((100vh-6rem)/3)] animate-fade-in"
          >
            {visibleOrders.map(order => (
              <KitchenOrderCard key={order.id} order={order} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
