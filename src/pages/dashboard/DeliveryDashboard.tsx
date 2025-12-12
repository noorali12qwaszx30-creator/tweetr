import { useState } from 'react';
import { useRole } from '@/contexts/RoleContext';
import { useSupabaseOrders } from '@/hooks/useSupabaseOrders';
import { OrderCard } from '@/components/OrderCard';
import { QuickAccessReturnButton } from '@/components/admin/QuickAccessReturnButton';
import { LogoutConfirmButton } from '@/components/LogoutConfirmButton';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ROLE_LABELS } from '@/types';
import {
  Truck,
  ClipboardList,
  Package,
  BarChart3,
  CheckCircle,
  XCircle,
  Phone,
  MessageCircle,
  Undo2,
  Loader2,
  Settings
} from 'lucide-react';

type TabType = 'orders' | 'delivering' | 'stats' | 'ready' | 'settings';

export default function DeliveryDashboard() {
  const { role, clearRole } = useRole();
  const { orders, updateOrderStatus, acceptDelivery, rejectDelivery, loading } = useSupabaseOrders();
  const [activeTab, setActiveTab] = useState<TabType>('orders');

  // Orders assigned to this delivery person (pending acceptance)
  const pendingAcceptanceOrders = orders.filter(o => o.status === 'ready' && o.pending_delivery_acceptance);
  const deliveringOrders = orders.filter(o => o.status === 'delivering');
  const deliveredOrders = orders.filter(o => o.status === 'delivered');
  const cancelledByDelivery = orders.filter(o => o.status === 'cancelled');
  const readyOrders = orders.filter(o => o.status === 'ready' && !o.pending_delivery_acceptance);

  const handleAcceptOrder = async (orderId: string) => {
    await acceptDelivery(orderId);
  };

  const handleRejectOrder = async (orderId: string) => {
    await rejectDelivery(orderId);
  };

  const handleDelivered = async (orderId: string) => {
    await updateOrderStatus(orderId, 'delivered');
    toast.success('تم التسليم بنجاح!');
  };

  const totalDelivered = deliveredOrders.length;
  const totalEarnings = totalDelivered * 1000; // 1000 per delivery

  const tabs: { id: TabType; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: 'orders', label: 'الطلبات', icon: <ClipboardList className="w-5 h-5" />, count: pendingAcceptanceOrders.length },
    { id: 'delivering', label: 'التوصيل', icon: <Truck className="w-5 h-5" />, count: deliveringOrders.length },
    { id: 'stats', label: 'الإحصائيات', icon: <BarChart3 className="w-5 h-5" /> },
    { id: 'ready', label: 'الجاهز', icon: <Package className="w-5 h-5" />, count: readyOrders.length },
    { id: 'settings', label: 'الإعدادات', icon: <Settings className="w-5 h-5" /> },
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
      <QuickAccessReturnButton />
      {/* Header */}
      <header className="bg-card border-b border-border shadow-soft sticky top-0 z-50">
        <div className="container flex items-center justify-between h-14 sm:h-16">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-info flex items-center justify-center">
              <Truck className="w-4 h-4 sm:w-5 sm:h-5 text-info-foreground" />
            </div>
            <div>
              <h1 className="font-bold text-foreground text-sm sm:text-base">الدلفري</h1>
              <p className="text-[10px] sm:text-xs text-muted-foreground">{role ? ROLE_LABELS[role] : ''}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-3 sm:py-4 pb-24">
        {activeTab === 'orders' && (
          <div className="space-y-3 sm:space-y-4">
            <h2 className="text-lg sm:text-xl font-bold">الطلبات المحولة إليك ({pendingAcceptanceOrders.length})</h2>
            {pendingAcceptanceOrders.length === 0 ? (
              <div className="text-center py-8 sm:py-12 text-muted-foreground">
                <ClipboardList className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-4 opacity-50" />
                <p>لا توجد طلبات محولة إليك</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                {pendingAcceptanceOrders.map(order => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    actions={
                      <>
                        <Button variant="success" size="sm" onClick={() => handleAcceptOrder(order.id)}>
                          <CheckCircle className="w-3 h-3 ml-1" />
                          قبول الطلب
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => handleRejectOrder(order.id)}>
                          <XCircle className="w-3 h-3 ml-1" />
                          رفض الطلب
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
              <div className="grid md:grid-cols-2 gap-4">
                {deliveringOrders.map(order => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    actions={
                      <div className="flex flex-wrap gap-2 w-full">
                        <Button variant="outline" size="sm" asChild>
                          <a href={`tel:${order.customer_phone}`}>
                            <Phone className="w-3 h-3 ml-1" />
                            اتصال
                          </a>
                        </Button>
                        <Button variant="success" size="sm" asChild>
                          <a href={`https://wa.me/${order.customer_phone}`} target="_blank" rel="noopener noreferrer">
                            <MessageCircle className="w-3 h-3 ml-1" />
                            واتساب
                          </a>
                        </Button>
                        <Button variant="default" size="sm" onClick={() => handleDelivered(order.id)}>
                          <CheckCircle className="w-3 h-3 ml-1" />
                          تم التوصيل
                        </Button>
                        <Button variant="warning" size="sm">
                          <Undo2 className="w-3 h-3 ml-1" />
                          راجع
                        </Button>
                      </div>
                    }
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="space-y-3 sm:space-y-4">
            <h2 className="text-lg sm:text-xl font-bold">الإحصائيات</h2>
            <div className="grid grid-cols-2 gap-2 sm:gap-4">
              <div className="bg-card border border-border rounded-xl p-3 sm:p-4 shadow-soft">
                <p className="text-muted-foreground text-xs sm:text-sm">الطلبات المكتملة</p>
                <p className="text-2xl sm:text-3xl font-bold text-success">{totalDelivered}</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-3 sm:p-4 shadow-soft">
                <p className="text-muted-foreground text-xs sm:text-sm">إجمالي الأرباح</p>
                <p className="text-2xl sm:text-3xl font-bold text-primary">{totalEarnings.toLocaleString()} د.ع</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-3 sm:p-4 shadow-soft">
                <p className="text-muted-foreground text-xs sm:text-sm">الطلبات الملغية</p>
                <p className="text-2xl sm:text-3xl font-bold text-destructive">{cancelledByDelivery.length}</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-3 sm:p-4 shadow-soft">
                <p className="text-muted-foreground text-xs sm:text-sm">الفائدة لكل طلب</p>
                <p className="text-2xl sm:text-3xl font-bold text-foreground">1,000 د.ع</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'ready' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">الطلبات الجاهزة ({readyOrders.length})</h2>
            {readyOrders.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>لا توجد طلبات جاهزة حالياً</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {readyOrders.map(order => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    showActions={false}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">الإعدادات</h2>
            <div className="grid gap-4">
              <LogoutConfirmButton />
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
    </div>
  );
}
