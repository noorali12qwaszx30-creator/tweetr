import { useRole } from '@/contexts/RoleContext';
import { useSupabaseOrders, DbOrderItem } from '@/hooks/useSupabaseOrders';
import { OrderTimer } from '@/components/OrderTimer';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ROLE_LABELS } from '@/types';
import { 
  ChefHat, 
  LogOut, 
  Clock, 
  CheckCircle, 
  Loader2,
  MessageSquare,
  AlertCircle
} from 'lucide-react';

export default function KitchenDashboard() {
  const { role, clearRole } = useRole();
  const { orders, updateOrderStatus, loading } = useSupabaseOrders();

  const preparingOrders = orders.filter(o => o.status === 'preparing');
  const pendingOrders = orders.filter(o => o.status === 'pending');

  const handleStartPreparing = async (orderId: string) => {
    await updateOrderStatus(orderId, 'preparing');
    toast.info('بدأ التحضير');
  };

  const handleReady = async (orderId: string) => {
    await updateOrderStatus(orderId, 'ready');
    toast.success('الطلب جاهز!');
  };

  const allKitchenOrders = [...pendingOrders, ...preparingOrders];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border shadow-soft sticky top-0 z-50">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-destructive flex items-center justify-center">
              <ChefHat className="w-5 h-5 text-destructive-foreground" />
            </div>
            <div>
              <h1 className="font-bold text-foreground">المطبخ</h1>
              <p className="text-xs text-muted-foreground">{role ? ROLE_LABELS[role] : ''}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm">
              <span className="text-muted-foreground">الطلبات: </span>
              <span className="font-bold text-primary">{allKitchenOrders.length}</span>
            </div>
            <Button variant="ghost" size="icon" onClick={clearRole}>
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-6">
        {allKitchenOrders.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <ChefHat className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-xl">لا توجد طلبات للتحضير</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {allKitchenOrders.map(order => {
              const hasNotes = !!order.notes || order.items.some((item: DbOrderItem) => !!item.notes);
              const isPreparing = order.status === 'preparing';

              return (
                <div
                  key={order.id}
                  className={`
                    bg-card rounded-xl border-2 shadow-soft p-4 transition-all duration-200
                    ${isPreparing ? 'border-info' : 'border-warning'}
                    ${hasNotes ? 'animate-shake-flip' : ''}
                  `}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-3xl font-bold text-primary">#{order.order_number}</span>
                    <OrderTimer startTime={new Date(order.created_at)} />
                  </div>

                  {/* Status Badge */}
                  <div className={`
                    inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium mb-4
                    ${isPreparing ? 'bg-info/10 text-info' : 'bg-warning/10 text-warning'}
                  `}>
                    {isPreparing ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        قيد التحضير
                      </>
                    ) : (
                      <>
                        <Clock className="w-3.5 h-3.5" />
                        بانتظار التحضير
                      </>
                    )}
                  </div>

                  {/* Order Type */}
                  {order.type === 'takeaway' && (
                    <div className="mb-3 px-3 py-1.5 bg-warning/20 border border-warning/30 rounded-lg text-center">
                      <span className="text-warning font-semibold text-sm">طلب سفري</span>
                    </div>
                  )}

                  {/* Items - Kitchen View (no prices, no customer info) */}
                  <div className="space-y-2 mb-4">
                    {order.items.map((item: DbOrderItem, idx: number) => (
                      <div
                        key={idx}
                        className={`
                          flex items-center justify-between p-3 rounded-lg
                          ${item.notes ? 'bg-warning/10 border border-warning/30' : 'bg-muted/50'}
                        `}
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-10 h-10 flex items-center justify-center bg-primary text-primary-foreground rounded-lg text-lg font-bold">
                            {item.quantity}
                          </span>
                          <span className="font-semibold text-foreground">{item.menu_item_name}</span>
                        </div>
                        {item.notes && (
                          <MessageSquare className="w-5 h-5 text-warning" />
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Item Notes */}
                  {order.items.some((item: DbOrderItem) => item.notes) && (
                    <div className="mb-4 space-y-2">
                      {order.items.filter((item: DbOrderItem) => item.notes).map((item: DbOrderItem, idx: number) => (
                        <div key={idx} className="p-2 bg-warning/10 border border-warning/30 rounded-lg">
                          <p className="text-xs text-warning font-medium mb-1">{item.menu_item_name}:</p>
                          <p className="text-sm text-warning">{item.notes}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Order Notes */}
                  {order.notes && (
                    <div className="mb-4 p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <AlertCircle className="w-4 h-4 text-destructive" />
                        <span className="text-xs text-destructive font-medium">ملاحظة:</span>
                      </div>
                      <p className="text-sm text-destructive">{order.notes}</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    {!isPreparing ? (
                      <Button
                        className="flex-1"
                        variant="info"
                        onClick={() => handleStartPreparing(order.id)}
                      >
                        <Loader2 className="w-4 h-4 ml-2" />
                        بدء التحضير
                      </Button>
                    ) : (
                      <Button
                        className="flex-1"
                        variant="success"
                        onClick={() => handleReady(order.id)}
                      >
                        <CheckCircle className="w-4 h-4 ml-2" />
                        جاهز
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
