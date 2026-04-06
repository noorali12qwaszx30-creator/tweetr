import { RefreshCw, ChefHat } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSupabaseOrders } from '@/hooks/useSupabaseOrders';
import { useKitchenAlarm } from '@/hooks/useKitchenAlarm';
import { KitchenOrderCard } from '@/components/KitchenOrderCard';
import { LogoutConfirmButton } from '@/components/LogoutConfirmButton';
import { ConnectionIndicator } from '@/components/shared/ConnectionIndicator';
import { toEnglishNumbers } from '@/lib/formatNumber';

export default function KitchenDashboard() {
  const { orders, loading, realtimeConnected, refetch } = useSupabaseOrders();
  
  // Activate kitchen alarm for orders > 30 min
  useKitchenAlarm(orders);
  
  // Filter preparing and pending orders, sort by oldest first
  const activeOrders = orders
    .filter(o => o.status === 'preparing' || o.status === 'pending')
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  return (
    <div className="flex flex-col h-dvh bg-background" dir="rtl">
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
