import { useState } from 'react';
import { useRole } from '@/contexts/RoleContext';
import { useSupabaseOrders, OrderWithItems } from '@/hooks/useSupabaseOrders';
import { OrderCard } from '@/components/OrderCard';
import { DeliveryPersonSelector } from '@/components/DeliveryPersonSelector';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ROLE_LABELS } from '@/types';
import {
  Users,
  LogOut,
  ClipboardList,
  CheckCircle,
  Truck,
  XCircle,
  Settings,
  Calculator,
  Clock,
  Loader2
} from 'lucide-react';

type TabType = 'orders' | 'ready' | 'delivering' | 'cancelled' | 'admin';

export default function FieldDashboard() {
  const { role, clearRole } = useRole();
  const { orders, updateOrderStatus, assignDelivery, cancelOrder, loading } = useSupabaseOrders();
  const [activeTab, setActiveTab] = useState<TabType>('orders');
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderWithItems | null>(null);

  const pendingOrders = orders.filter(o => o.status === 'pending');
  const preparingOrders = orders.filter(o => o.status === 'preparing');
  const readyOrders = orders.filter(o => o.status === 'ready' && !o.pending_delivery_acceptance);
  const pendingAcceptanceOrders = orders.filter(o => o.status === 'ready' && o.pending_delivery_acceptance);
  const deliveringOrders = orders.filter(o => o.status === 'delivering');
  const cancelledOrders = orders.filter(o => o.status === 'cancelled');

  const incomingOrders = [...pendingOrders, ...preparingOrders];

  const handleOpenSelector = (order: OrderWithItems) => {
    setSelectedOrder(order);
    setSelectorOpen(true);
  };

  const handleAssignDelivery = async (deliveryPersonId: string, deliveryPersonName: string) => {
    if (selectedOrder) {
      await assignDelivery(selectedOrder.id, deliveryPersonId, deliveryPersonName);
      setSelectedOrder(null);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    await cancelOrder(orderId);
  };

  const handleMarkReady = async (orderId: string) => {
    await updateOrderStatus(orderId, 'ready');
  };

  const tabs: { id: TabType; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: 'orders', label: 'الطلبات', icon: <ClipboardList className="w-5 h-5" />, count: incomingOrders.length },
    { id: 'ready', label: 'الجاهز', icon: <CheckCircle className="w-5 h-5" />, count: readyOrders.length },
    { id: 'delivering', label: 'قيد التوصيل', icon: <Truck className="w-5 h-5" />, count: deliveringOrders.length },
    { id: 'cancelled', label: 'الملغية', icon: <XCircle className="w-5 h-5" />, count: cancelledOrders.length },
    { id: 'admin', label: 'الإدارة', icon: <Settings className="w-5 h-5" /> },
  ];

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
        <div className="container flex items-center justify-between h-14 sm:h-16">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-secondary flex items-center justify-center">
              <Users className="w-4 h-4 sm:w-5 sm:h-5 text-secondary-foreground" />
            </div>
            <div>
              <h1 className="font-bold text-foreground text-sm sm:text-base">الميدان</h1>
              <p className="text-[10px] sm:text-xs text-muted-foreground">{role ? ROLE_LABELS[role] : ''}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-10 sm:w-10" onClick={clearRole}>
            <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-3 sm:py-4 pb-24">
        {activeTab === 'orders' && (
          <div className="space-y-3 sm:space-y-4">
            <h2 className="text-lg sm:text-xl font-bold">الطلبات الواردة ({incomingOrders.length})</h2>
            {incomingOrders.length === 0 ? (
              <div className="text-center py-8 sm:py-12 text-muted-foreground">
                <ClipboardList className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-4 opacity-50" />
                <p>لا توجد طلبات واردة</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {incomingOrders.map(order => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    actions={
                      <>
                        <Button variant="success" size="sm" onClick={() => handleMarkReady(order.id)}>
                          <CheckCircle className="w-3 h-3 ml-1" />
                          نقل للجاهز
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => handleCancelOrder(order.id)}>
                          <XCircle className="w-3 h-3 ml-1" />
                          إلغاء
                        </Button>
                      </>
                    }
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'ready' && (
          <div className="space-y-4">
            {/* Pending Acceptance Section */}
            {pendingAcceptanceOrders.length > 0 && (
              <div className="mb-6">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-warning" />
                  بانتظار قبول الدلفري ({pendingAcceptanceOrders.length})
                </h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pendingAcceptanceOrders.map(order => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      actions={
                        <div className="w-full p-2 bg-warning/10 border border-warning/30 rounded-lg text-center">
                          <p className="text-sm text-warning">
                            بانتظار قبول {order.delivery_person_name}
                          </p>
                        </div>
                      }
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Ready Orders Section */}
            <h2 className="text-xl font-bold">الطلبات الجاهزة ({readyOrders.length})</h2>
            {readyOrders.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>لا توجد طلبات جاهزة</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {readyOrders.map(order => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    actions={
                      <>
                        <Button variant="default" size="sm" onClick={() => handleOpenSelector(order)}>
                          <Truck className="w-3 h-3 ml-1" />
                          تعيين دلفري
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => handleCancelOrder(order.id)}>
                          <XCircle className="w-3 h-3 ml-1" />
                          إلغاء
                        </Button>
                      </>
                    }
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'delivering' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">قيد التوصيل ({deliveringOrders.length})</h2>
            {deliveringOrders.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Truck className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>لا توجد طلبات قيد التوصيل</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {deliveringOrders.map(order => (
                  <OrderCard key={order.id} order={order} showActions={false} />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'cancelled' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">الطلبات الملغية ({cancelledOrders.length})</h2>
            {cancelledOrders.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <XCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>لا توجد طلبات ملغية</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {cancelledOrders.map(order => (
                  <OrderCard key={order.id} order={order} showActions={false} />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'admin' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">الإدارة</h2>
            <div className="grid gap-4">
              <Button variant="outline" size="lg" className="justify-start h-auto py-4">
                <Calculator className="w-5 h-5 ml-3" />
                <div className="text-right">
                  <p className="font-semibold">المحاسبة</p>
                  <p className="text-sm text-muted-foreground">تفاصيل حسابات الدلفري</p>
                </div>
              </Button>
              <Button variant="destructive" size="lg" className="justify-start h-auto py-4" onClick={clearRole}>
                <LogOut className="w-5 h-5 ml-3" />
                <div className="text-right">
                  <p className="font-semibold">تغيير الدور</p>
                  <p className="text-sm text-destructive-foreground/70">العودة لاختيار الدور</p>
                </div>
              </Button>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border shadow-elevated">
        <div className="container flex">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-3 flex flex-col items-center gap-1 transition-colors relative ${
                activeTab === tab.id ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              {tab.icon}
              <span className="text-xs font-medium">{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span className="absolute top-1 right-1/2 translate-x-4 w-5 h-5 bg-destructive text-destructive-foreground rounded-full text-xs flex items-center justify-center">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </nav>
      {/* Delivery Person Selector */}
      <DeliveryPersonSelector
        open={selectorOpen}
        onOpenChange={setSelectorOpen}
        onSelect={handleAssignDelivery}
        orderNumber={selectedOrder?.order_number || 0}
      />
    </div>
  );
}
