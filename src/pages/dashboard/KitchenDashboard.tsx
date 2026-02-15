import { RefreshCw, ChefHat } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useSupabaseOrders, OrderWithItems } from '@/hooks/useSupabaseOrders';
import { OrderTimer } from '@/components/OrderTimer';
import { LogoutConfirmButton } from '@/components/LogoutConfirmButton';
import { ConnectionIndicator } from '@/components/shared/ConnectionIndicator';
import { toEnglishNumbers } from '@/lib/formatNumber';

// Kitchen order card component - optimized for large display
function KitchenOrderCard({ order }: { order: OrderWithItems }) {
  return (
    <Card className={`p-2 border-2 hover:border-primary/30 transition-colors h-full flex flex-col overflow-hidden ${
      order.type === 'delivery' 
        ? 'bg-info/5 border-info/40' 
        : 'bg-success/5 border-success/40'
    }`}>
      {/* Unified top bar */}
      <div className={`flex items-center justify-between mb-1 px-2 py-1 rounded-md -mx-2 -mt-2 ${
        order.type === 'delivery' 
          ? 'bg-info/20' 
          : 'bg-success/20'
      }`}>
        <div className="flex items-center gap-1.5">
          <span className="text-lg font-black text-primary">
            #{toEnglishNumbers(order.order_number.toString())}
          </span>
          <span className={`text-[10px] font-bold ${
            order.type === 'delivery' ? 'text-info' : 'text-success'
          }`}>
            {order.type === 'delivery' ? 'توصيل' : 'سفري'}
          </span>
        </div>
        <OrderTimer startTime={order.created_at} className="text-xs px-1.5 py-0.5" />
      </div>
      
      {/* Items list */}
      <ul className="space-y-0.5 flex-1">
        {order.items.map(item => (
          <li key={item.id} className="text-xs">
            <div className="flex items-start gap-1">
              <span className="font-black text-primary min-w-[1.5rem]">
                {toEnglishNumbers(item.quantity.toString())}×
              </span>
              <div className="flex-1">
                <span className="font-bold text-foreground">{item.menu_item_name}</span>
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
        <div className="mt-1 p-1.5 bg-warning/10 border border-warning/30 rounded">
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
