import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useOrders } from '@/contexts/OrderContext';
import { Button } from '@/components/ui/button';
import { CancellationReasonsManager } from '@/components/CancellationReasonsManager';
import { toast } from 'sonner';
import {
  Settings,
  LogOut,
  Users,
  BarChart3,
  RefreshCcw,
  UserPlus,
  Trash2,
  ShieldCheck,
  XCircle
} from 'lucide-react';

type TabType = 'stats' | 'users' | 'settings' | 'cancellation';

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const { orders } = useOrders();
  const [activeTab, setActiveTab] = useState<TabType>('stats');

  const totalOrders = orders.length;
  const completedOrders = orders.filter(o => o.status === 'delivered').length;
  const cancelledOrders = orders.filter(o => o.status === 'cancelled').length;
  const totalRevenue = orders
    .filter(o => o.status === 'delivered')
    .reduce((sum, o) => sum + o.totalPrice, 0);

  // Count items sold
  const itemsSold: Record<string, number> = {};
  orders
    .filter(o => o.status === 'delivered')
    .forEach(order => {
      order.items.forEach(item => {
        itemsSold[item.menuItem.name] = (itemsSold[item.menuItem.name] || 0) + item.quantity;
      });
    });

  const topItems = Object.entries(itemsSold)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  const handleResetShift = () => {
    toast.success('تم إعادة ضبط الشفت');
  };

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'stats', label: 'الإحصائيات', icon: <BarChart3 className="w-5 h-5" /> },
    { id: 'users', label: 'المستخدمين', icon: <Users className="w-5 h-5" /> },
    { id: 'cancellation', label: 'أسباب الإلغاء', icon: <XCircle className="w-5 h-5" /> },
    { id: 'settings', label: 'الإعدادات', icon: <Settings className="w-5 h-5" /> },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border shadow-soft sticky top-0 z-50">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-accent-foreground" />
            </div>
            <div>
              <h1 className="font-bold text-foreground">المدير التنفيذي</h1>
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
        {activeTab === 'stats' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold">الإحصائيات الشاملة</h2>
            
            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-card border border-border rounded-xl p-4 shadow-soft">
                <p className="text-muted-foreground text-sm">إجمالي الطلبات</p>
                <p className="text-3xl font-bold text-primary">{totalOrders}</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-4 shadow-soft">
                <p className="text-muted-foreground text-sm">الطلبات المكتملة</p>
                <p className="text-3xl font-bold text-success">{completedOrders}</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-4 shadow-soft">
                <p className="text-muted-foreground text-sm">الطلبات الملغية</p>
                <p className="text-3xl font-bold text-destructive">{cancelledOrders}</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-4 shadow-soft">
                <p className="text-muted-foreground text-sm">إجمالي الإيرادات</p>
                <p className="text-2xl font-bold text-primary">{totalRevenue.toLocaleString()} د.ع</p>
              </div>
            </div>

            {/* Top Items */}
            <div className="bg-card border border-border rounded-xl p-4 shadow-soft">
              <h3 className="font-bold mb-4">أكثر الأصناف مبيعاً</h3>
              {topItems.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">لا توجد بيانات</p>
              ) : (
                <div className="space-y-3">
                  {topItems.map(([name, count], idx) => (
                    <div key={name} className="flex items-center gap-3">
                      <span className="w-8 h-8 flex items-center justify-center bg-primary/10 text-primary rounded-lg font-bold">
                        {idx + 1}
                      </span>
                      <span className="flex-1 text-foreground">{name}</span>
                      <span className="text-muted-foreground">{count} قطعة</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Reset Shift */}
            <Button
              variant="destructive"
              size="lg"
              className="w-full"
              onClick={handleResetShift}
            >
              <RefreshCcw className="w-5 h-5 ml-2" />
              إعادة ضبط الشفت
            </Button>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">إدارة المستخدمين</h2>
              <Button>
                <UserPlus className="w-4 h-4 ml-2" />
                إضافة مستخدم
              </Button>
            </div>
            
            {/* Demo Users List */}
            <div className="space-y-3">
              {['كاشيرة 1', 'ميدان 1', 'دلفري 1', 'سفري 1', 'مطبخ 1'].map(name => (
                <div key={name} className="bg-card border border-border rounded-xl p-4 shadow-soft flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-foreground">{name}</p>
                    <p className="text-sm text-muted-foreground">نشط</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">تعديل</Button>
                    <Button variant="destructive" size="sm">
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'cancellation' && (
          <div className="bg-card border border-border rounded-xl p-4 shadow-soft">
            <CancellationReasonsManager />
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">الإعدادات</h2>
            <div className="space-y-3">
              <Button variant="outline" size="lg" className="w-full justify-start h-auto py-4">
                <Settings className="w-5 h-5 ml-3" />
                <div className="text-right">
                  <p className="font-semibold">إعدادات النظام</p>
                  <p className="text-sm text-muted-foreground">تخصيص إعدادات التطبيق</p>
                </div>
              </Button>
              <Button variant="destructive" size="lg" className="w-full justify-start h-auto py-4" onClick={logout}>
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
              className={`flex-1 py-3 flex flex-col items-center gap-1 transition-colors ${
                activeTab === tab.id ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              {tab.icon}
              <span className="text-xs font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
