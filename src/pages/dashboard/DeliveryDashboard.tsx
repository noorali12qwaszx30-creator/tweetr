import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useOrders } from '@/contexts/OrderContext';
import { OrderCard } from '@/components/OrderCard';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  Truck,
  LogOut,
  ClipboardList,
  Package,
  BarChart3,
  CheckCircle,
  XCircle,
  Phone,
  MessageCircle,
  Undo2
} from 'lucide-react';

type TabType = 'orders' | 'delivering' | 'stats' | 'ready';

export default function DeliveryDashboard() {
  const { user, logout } = useAuth();
  const { orders, updateOrderStatus } = useOrders();
  const [activeTab, setActiveTab] = useState<TabType>('orders');

  // Orders assigned to this delivery person
  const assignedOrders = orders.filter(o => o.status === 'ready');
  const deliveringOrders = orders.filter(o => o.status === 'delivering' && o.deliveryPersonId);
  const deliveredOrders = orders.filter(o => o.status === 'delivered');
  const cancelledByDelivery = orders.filter(o => o.status === 'cancelled');

  const handleAcceptOrder = (orderId: string) => {
    updateOrderStatus(orderId, 'delivering');
    toast.success('تم قبول الطلب');
  };

  const handleRejectOrder = (orderId: string) => {
    toast.info('تم إرسال إشعار للميدان');
  };

  const handleDelivered = (orderId: string) => {
    updateOrderStatus(orderId, 'delivered');
    toast.success('تم التسليم بنجاح!');
  };

  const totalDelivered = deliveredOrders.length;
  const totalEarnings = totalDelivered * 1000; // 1000 per delivery

  const tabs: { id: TabType; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: 'orders', label: 'الطلبات', icon: <ClipboardList className="w-5 h-5" />, count: assignedOrders.length },
    { id: 'delivering', label: 'التوصيل', icon: <Truck className="w-5 h-5" />, count: deliveringOrders.length },
    { id: 'stats', label: 'الإحصائيات', icon: <BarChart3 className="w-5 h-5" /> },
    { id: 'ready', label: 'الجاهز', icon: <Package className="w-5 h-5" /> },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border shadow-soft sticky top-0 z-50">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-info flex items-center justify-center">
              <Truck className="w-5 h-5 text-info-foreground" />
            </div>
            <div>
              <h1 className="font-bold text-foreground">الدلفري</h1>
              <p className="text-xs text-muted-foreground">{user?.username}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={logout}>
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-4 pb-24">
        {activeTab === 'orders' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">الطلبات المتاحة ({assignedOrders.length})</h2>
            {assignedOrders.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <ClipboardList className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>لا توجد طلبات متاحة</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {assignedOrders.map(order => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    actions={
                      <>
                        <Button variant="success" size="sm" onClick={() => handleAcceptOrder(order.id)}>
                          <CheckCircle className="w-3 h-3 ml-1" />
                          موافقة
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => handleRejectOrder(order.id)}>
                          <XCircle className="w-3 h-3 ml-1" />
                          رفض
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
                          <a href={`tel:${order.customer.phone}`}>
                            <Phone className="w-3 h-3 ml-1" />
                            اتصال
                          </a>
                        </Button>
                        <Button variant="success" size="sm" asChild>
                          <a href={`https://wa.me/${order.customer.phone}`} target="_blank" rel="noopener noreferrer">
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
          <div className="space-y-4">
            <h2 className="text-xl font-bold">الإحصائيات</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-card border border-border rounded-xl p-4 shadow-soft">
                <p className="text-muted-foreground text-sm">الطلبات المكتملة</p>
                <p className="text-3xl font-bold text-success">{totalDelivered}</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-4 shadow-soft">
                <p className="text-muted-foreground text-sm">إجمالي الأرباح</p>
                <p className="text-3xl font-bold text-primary">{totalEarnings.toLocaleString()} د.ع</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-4 shadow-soft">
                <p className="text-muted-foreground text-sm">الطلبات الملغية</p>
                <p className="text-3xl font-bold text-destructive">{cancelledByDelivery.length}</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-4 shadow-soft">
                <p className="text-muted-foreground text-sm">الفائدة لكل طلب</p>
                <p className="text-3xl font-bold text-foreground">1,000 د.ع</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'ready' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">الطلبات الجاهزة</h2>
            <div className="text-center py-12 text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>طلبات المطبخ الجاهزة للتوصيل</p>
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
