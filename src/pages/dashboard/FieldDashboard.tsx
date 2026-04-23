import { useState } from 'react';
import { useRole } from '@/contexts/RoleContext';
import { useAuth } from '@/contexts/AuthContext';
import { useSupabaseOrders, OrderWithItems } from '@/hooks/useSupabaseOrders';
import { OrderCard } from '@/components/OrderCard';
import { DeliveryPersonSelector } from '@/components/DeliveryPersonSelector';
import { DeliveryAccountingDialog } from '@/components/DeliveryAccountingDialog';
import { LogoutConfirmButton } from '@/components/LogoutConfirmButton';
import { CancelOrderDialog } from '@/components/CancelOrderDialog';
import { OrderDetailsDialog } from '@/components/OrderDetailsDialog';
import { DashboardHeader } from '@/components/shared/DashboardHeader';
import { BottomNavigation } from '@/components/shared/BottomNavigation';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ROLE_LABELS } from '@/types';
import {
  Users,
  ClipboardList,
  CheckCircle,
  Truck,
  XCircle,
  Settings,
  Clock,
  Loader2,
  HandMetal
} from 'lucide-react';

type TabType = 'orders' | 'ready' | 'delivering' | 'delivered' | 'cancelled' | 'admin';

export default function FieldDashboard() {
  const { role } = useRole();
  const { user } = useAuth();
  const { orders, updateOrderStatus, assignDelivery, cancelOrder, loading, realtimeConnected } = useSupabaseOrders({ orderTypeFilter: 'all' });
  const [activeTab, setActiveTab] = useState<TabType>('orders');
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderWithItems | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState<OrderWithItems | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<OrderWithItems | null>(null);

  // Filter delivery and pickup orders - takeaway orders are handled separately
  const fieldOrders = orders.filter(o => o.type === 'delivery' || o.type === 'pickup');
  
  const pendingOrders = fieldOrders.filter(o => o.status === 'pending');
  const preparingOrders = fieldOrders.filter(o => o.status === 'preparing');
  const readyOrders = fieldOrders.filter(o => o.status === 'ready' && !o.pending_delivery_acceptance);
  const pendingAcceptanceOrders = fieldOrders.filter(o => o.status === 'ready' && o.pending_delivery_acceptance);
  const deliveringOrders = fieldOrders.filter(o => o.status === 'delivering');
  const cancelledOrders = fieldOrders.filter(o => o.status === 'cancelled');
  const deliveredOrders = fieldOrders.filter(o => o.status === 'delivered');

  const incomingOrders = [...pendingOrders, ...preparingOrders];

  const handleDirectDeliver = async (orderId: string) => {
    await updateOrderStatus(orderId, 'delivered');
    toast.success('تم تسليم الطلب بنجاح');
  };

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

  const handleOpenCancelDialog = (order: OrderWithItems) => {
    setOrderToCancel(order);
    setCancelDialogOpen(true);
  };

  const handleCancelWithReason = async (orderId: string, reason: string) => {
    await cancelOrder(orderId, reason);
    setCancelDialogOpen(false);
    setOrderToCancel(null);
  };

  const handleMarkReady = async (orderId: string) => {
    await updateOrderStatus(orderId, 'ready');
  };

  const handleOpenDetails = (order: OrderWithItems) => {
    setSelectedOrderDetails(order);
    setDetailsDialogOpen(true);
  };

  const tabs: { id: TabType; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: 'orders', label: 'الطلبات', icon: <ClipboardList className="w-5 h-5" />, count: incomingOrders.length },
    { id: 'ready', label: 'الجاهز', icon: <CheckCircle className="w-5 h-5" />, count: readyOrders.length },
    { id: 'delivering', label: 'قيد التوصيل', icon: <Truck className="w-5 h-5" />, count: deliveringOrders.length },
    { id: 'delivered', label: 'المكتمل', icon: <CheckCircle className="w-5 h-5" /> },
    { id: 'cancelled', label: 'الملغي', icon: <XCircle className="w-5 h-5" /> },
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
    <div className="flex flex-col h-dvh bg-background">
      <DashboardHeader 
        title="الميدان" 
        subtitle={user?.fullName || user?.username || ''} 
        icon={Users} 
        iconClassName="bg-secondary"
        realtimeConnected={realtimeConnected}
        showConnectionIndicator={true}
      />

      {/* Main Content */}
      <main className="container py-3 sm:py-4 flex-1 overflow-auto">
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
                        <Button variant="destructive" size="sm" onClick={() => handleOpenCancelDialog(order)}>
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
                  بانتظار قبول موظف التوصيل ({pendingAcceptanceOrders.length})
                </h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pendingAcceptanceOrders.map(order => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      actions={
                        <div className="w-full space-y-2">
                          <div className="p-2 bg-warning/10 border border-warning/30 rounded-lg text-center">
                            <p className="text-sm text-warning">
                              بانتظار قبول {order.delivery_person_name}
                            </p>
                          </div>
                          <Button variant="outline" size="sm" className="w-full" onClick={() => handleOpenSelector(order)}>
                            <Users className="w-3 h-3 ml-1" />
                            تغيير موظف التوصيل
                          </Button>
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
                      order.type === 'pickup' ? (
                        <>
                          <Button variant="success" size="sm" onClick={() => handleDirectDeliver(order.id)}>
                            <HandMetal className="w-3 h-3 ml-1" />
                            تم التسليم
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => handleOpenCancelDialog(order)}>
                            <XCircle className="w-3 h-3 ml-1" />
                            إلغاء
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button variant="default" size="sm" onClick={() => handleOpenSelector(order)}>
                            <Truck className="w-3 h-3 ml-1" />
                            تعيين موظف توصيل
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => handleOpenCancelDialog(order)}>
                            <XCircle className="w-3 h-3 ml-1" />
                            إلغاء
                          </Button>
                        </>
                      )
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
                  <OrderCard
                    key={order.id}
                    order={order}
                    actions={
                      <Button variant="outline" size="sm" className="w-full" onClick={() => handleOpenSelector(order)}>
                        <Users className="w-3 h-3 ml-1" />
                        تغيير موظف التوصيل
                      </Button>
                    }
                  />
                 ))}
               </div>
             )}
           </div>
         )}

         {activeTab === 'delivered' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-success" />
              الطلبات المكتملة ({deliveredOrders.length})
            </h2>
            {deliveredOrders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground bg-card rounded-xl border border-border">
                <CheckCircle className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p>لا توجد طلبات مكتملة</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {deliveredOrders.map(order => (
                  <div key={order.id} onClick={() => handleOpenDetails(order)} className="cursor-pointer">
                    <OrderCard order={order} showActions={false} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'cancelled' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <XCircle className="w-5 h-5 text-destructive" />
              الطلبات الملغية ({cancelledOrders.length})
            </h2>
            {cancelledOrders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground bg-card rounded-xl border border-border">
                <XCircle className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p>لا توجد طلبات ملغية</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {cancelledOrders.map(order => (
                  <div key={order.id} onClick={() => handleOpenDetails(order)} className="cursor-pointer">
                    <OrderCard order={order} showActions={false} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'admin' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Settings className="w-6 h-6 text-primary" />
              الإدارة
            </h2>
            
            <div className="space-y-3">
              <DeliveryAccountingDialog orders={orders} />
            </div>

            <div className="mt-6">
              <LogoutConfirmButton />
            </div>
          </div>
        )}
      </main>

      <BottomNavigation
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={(id) => setActiveTab(id as TabType)}
      />
      {/* Delivery Person Selector */}
      <DeliveryPersonSelector
        open={selectorOpen}
        onOpenChange={setSelectorOpen}
        onSelect={handleAssignDelivery}
        orderNumber={selectedOrder?.order_number || 0}
      />

      {/* Cancel Order Dialog */}
      {orderToCancel && (
        <CancelOrderDialog
          orderId={orderToCancel.id}
          orderNumber={orderToCancel.order_number}
          open={cancelDialogOpen}
          onOpenChange={setCancelDialogOpen}
          onCancel={handleCancelWithReason}
        />
      )}

      {/* Order Details Dialog */}
      <OrderDetailsDialog
        order={selectedOrderDetails}
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
      />
    </div>
  );
}
