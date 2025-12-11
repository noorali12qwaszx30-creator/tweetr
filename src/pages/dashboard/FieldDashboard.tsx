import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useOrders } from '@/contexts/OrderContext';
import { OrderCard } from '@/components/OrderCard';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  Users,
  LogOut,
  ClipboardList,
  CheckCircle,
  Truck,
  XCircle,
  Settings,
  Calculator
} from 'lucide-react';

type TabType = 'orders' | 'ready' | 'delivering' | 'cancelled' | 'admin';

export default function FieldDashboard() {
  const { user, logout } = useAuth();
  const { orders, updateOrderStatus, assignDelivery } = useOrders();
  const [activeTab, setActiveTab] = useState<TabType>('orders');

  const pendingOrders = orders.filter(o => o.status === 'pending');
  const preparingOrders = orders.filter(o => o.status === 'preparing');
  const readyOrders = orders.filter(o => o.status === 'ready');
  const deliveringOrders = orders.filter(o => o.status === 'delivering');
  const cancelledOrders = orders.filter(o => o.status === 'cancelled');

  const incomingOrders = [...pendingOrders, ...preparingOrders];

  const handleAssignDelivery = (orderId: string) => {
    // In real app, this would open a modal to select delivery person
    assignDelivery(orderId, 'delivery-1', 'محمد الدلفري');
    toast.success('تم تعيين الدلفري');
  };

  const handleCancelOrder = (orderId: string) => {
    updateOrderStatus(orderId, 'cancelled');
    toast.info('تم إلغاء الطلب');
  };

  const tabs: { id: TabType; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: 'orders', label: 'الطلبات', icon: <ClipboardList className="w-5 h-5" />, count: incomingOrders.length },
    { id: 'ready', label: 'الجاهز', icon: <CheckCircle className="w-5 h-5" />, count: readyOrders.length },
    { id: 'delivering', label: 'قيد التوصيل', icon: <Truck className="w-5 h-5" />, count: deliveringOrders.length },
    { id: 'cancelled', label: 'الملغية', icon: <XCircle className="w-5 h-5" />, count: cancelledOrders.length },
    { id: 'admin', label: 'الإدارة', icon: <Settings className="w-5 h-5" /> },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border shadow-soft sticky top-0 z-50">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
              <Users className="w-5 h-5 text-secondary-foreground" />
            </div>
            <div>
              <h1 className="font-bold text-foreground">الميدان</h1>
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
            <h2 className="text-xl font-bold">الطلبات الواردة ({incomingOrders.length})</h2>
            {incomingOrders.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <ClipboardList className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>لا توجد طلبات واردة</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {incomingOrders.map(order => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    actions={
                      <>
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
                        <Button variant="default" size="sm" onClick={() => handleAssignDelivery(order.id)}>
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
              <Button variant="destructive" size="lg" className="justify-start h-auto py-4" onClick={logout}>
                <LogOut className="w-5 h-5 ml-3" />
                <div className="text-right">
                  <p className="font-semibold">تسجيل خروج</p>
                  <p className="text-sm text-destructive-foreground/70">الخروج من الحساب</p>
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
    </div>
  );
}
