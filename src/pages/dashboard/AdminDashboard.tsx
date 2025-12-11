import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useOrders, MENU_ITEMS } from '@/contexts/OrderContext';
import { useShift } from '@/contexts/ShiftContext';
import { Order } from '@/types';
import { Button } from '@/components/ui/button';
import { CancellationReasonsManager } from '@/components/CancellationReasonsManager';
import { UserManagement } from '@/components/admin/UserManagement';
import { OrderDetailsDialog } from '@/components/OrderDetailsDialog';
import { KPICard } from '@/components/admin/KPICard';
import { OrdersChart, WeeklyChart } from '@/components/admin/OrdersChart';
import { DriverPerformance } from '@/components/admin/DriverPerformance';
import { ActivityLogList } from '@/components/admin/ActivityLogList';
import { CustomerAnalytics } from '@/components/admin/CustomerAnalytics';
import { FinanceBreakdown } from '@/components/admin/FinanceBreakdown';
import { ShiftHeader } from '@/components/admin/ShiftHeader';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Settings,
  LogOut,
  Users,
  BarChart3,
  RefreshCcw,
  UserPlus,
  Trash2,
  ShieldCheck,
  XCircle,
  CheckCircle,
  ClipboardList,
  Eye,
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Clock,
  Truck,
  Activity,
  PieChart,
  Timer,
  Zap,
  AlertTriangle,
  Home,
  Package,
  ChevronLeft
} from 'lucide-react';

// Main navigation tabs (5 only)
type MainTab = 'home' | 'orders' | 'stats' | 'delivery' | 'settings';

// Sub-tabs for each main section
type OrdersSubTab = 'completed' | 'cancelled';
type StatsSubTab = 'overview' | 'items' | 'customers' | 'finance';
type SettingsSubTab = 'general' | 'users' | 'reasons';

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const { orders } = useOrders();
  const { currentShift, previousShift, activityLogs, lastUpdated, resetShift, addActivityLog } = useShift();
  
  const [activeTab, setActiveTab] = useState<MainTab>('home');
  const [ordersSubTab, setOrdersSubTab] = useState<OrdersSubTab>('completed');
  const [statsSubTab, setStatsSubTab] = useState<StatsSubTab>('overview');
  const [settingsSubTab, setSettingsSubTab] = useState<SettingsSubTab>('general');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Statistics calculations
  const totalOrders = orders.length;
  const completedOrders = orders.filter(o => o.status === 'delivered');
  const cancelledOrders = orders.filter(o => o.status === 'cancelled');
  const pendingOrders = orders.filter(o => o.status === 'pending');
  const inProgressOrders = orders.filter(o => ['preparing', 'ready', 'delivering'].includes(o.status));
  
  const totalRevenue = completedOrders.reduce((sum, o) => sum + o.totalPrice, 0);
  const cancelledRevenue = cancelledOrders.reduce((sum, o) => sum + o.totalPrice, 0);
  const averageOrderValue = completedOrders.length > 0 ? totalRevenue / completedOrders.length : 0;

  // Simulated time stats
  const avgPrepTime = 12;
  const avgDeliveryTime = 28;
  const fastestDelivery = 15;
  const slowestDelivery = 45;

  // Count items sold
  const itemsStats: Record<string, { quantity: number; revenue: number; price: number; category: string }> = {};
  completedOrders.forEach(order => {
    order.items.forEach(item => {
      const key = item.menuItem.name;
      if (!itemsStats[key]) {
        itemsStats[key] = { quantity: 0, revenue: 0, price: item.menuItem.price, category: item.menuItem.category };
      }
      itemsStats[key].quantity += item.quantity;
      itemsStats[key].revenue += item.menuItem.price * item.quantity;
    });
  });

  const sortedItems = Object.entries(itemsStats).sort(([, a], [, b]) => b.quantity - a.quantity);

  // Cancellation reasons stats
  const cancellationReasonStats: Record<string, number> = {};
  cancelledOrders.forEach(order => {
    const reason = order.cancellationReason || 'بدون سبب';
    cancellationReasonStats[reason] = (cancellationReasonStats[reason] || 0) + 1;
  });

  // Unique customers
  const uniqueCustomers = new Set(orders.map(o => o.customer.phone)).size;
  const newCustomers = orders.filter((o, idx, arr) => 
    arr.findIndex(x => x.customer.phone === o.customer.phone) === idx
  ).length;

  const handleResetShift = () => {
    resetShift();
    addActivityLog('إعادة ضبط الشفت', 'تم إعادة ضبط الشفت وتصفير الإحصائيات', user?.username);
    toast.success('تم إعادة ضبط الشفت بنجاح');
  };

  const handleRefresh = () => {
    toast.success('تم تحديث البيانات');
  };

  const getTrend = (current: number, previous: number | undefined) => {
    if (!previous || previous === 0) return 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  // Main navigation tabs
  const mainTabs: { id: MainTab; label: string; icon: React.ReactNode }[] = [
    { id: 'home', label: 'الرئيسية', icon: <Home className="w-5 h-5" /> },
    { id: 'orders', label: 'الطلبات', icon: <Package className="w-5 h-5" /> },
    { id: 'stats', label: 'الإحصائيات', icon: <BarChart3 className="w-5 h-5" /> },
    { id: 'delivery', label: 'الدلفري', icon: <Truck className="w-5 h-5" /> },
    { id: 'settings', label: 'الإعدادات', icon: <Settings className="w-5 h-5" /> },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border shadow-soft sticky top-0 z-50">
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-bold text-foreground text-sm">المدير التنفيذي</h1>
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
        
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* HOME TAB - Dashboard Overview */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'home' && (
          <div className="space-y-4">
            {/* Shift Header */}
            <ShiftHeader
              restaurantName="مطعمي"
              branchName="الفرع الرئيسي"
              shiftNumber={currentShift.shiftNumber}
              shiftStartTime={currentShift.startTime}
              lastUpdated={lastUpdated}
              onReset={handleResetShift}
              onRefresh={handleRefresh}
            />

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KPICard
                title="إجمالي الطلبات"
                value={totalOrders}
                icon={<ClipboardList className="w-5 h-5" />}
                trend={getTrend(totalOrders, previousShift?.totalOrders)}
              />
              <KPICard
                title="المكتملة"
                value={completedOrders.length}
                icon={<CheckCircle className="w-5 h-5" />}
                variant="success"
              />
              <KPICard
                title="الملغية"
                value={cancelledOrders.length}
                icon={<XCircle className="w-5 h-5" />}
                variant="destructive"
              />
              <KPICard
                title="الإيرادات"
                value={totalRevenue}
                suffix="د.ع"
                icon={<DollarSign className="w-5 h-5" />}
                variant="success"
              />
            </div>

            {/* Charts */}
            <OrdersChart orders={orders} />

            {/* Top Items Quick View */}
            <div className="bg-card border border-border rounded-xl p-4 shadow-soft">
              <h3 className="font-bold mb-3 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                أكثر الأصناف مبيعاً
              </h3>
              {sortedItems.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">لا توجد بيانات</p>
              ) : (
                <div className="space-y-2">
                  {sortedItems.slice(0, 5).map(([name, stats], idx) => (
                    <div key={name} className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg">
                      <span className="w-7 h-7 flex items-center justify-center bg-primary/10 text-primary rounded-lg font-bold text-sm">
                        {idx + 1}
                      </span>
                      <span className="flex-1 font-medium">{name}</span>
                      <span className="font-bold text-primary">{stats.quantity}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Activity Log */}
            <ActivityLogList logs={activityLogs} />
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* ORDERS TAB - Completed & Cancelled Orders */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            {/* Sub-tabs */}
            <Tabs value={ordersSubTab} onValueChange={(v) => setOrdersSubTab(v as OrdersSubTab)}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="completed" className="gap-2">
                  <CheckCircle className="w-4 h-4" />
                  المكتملة ({completedOrders.length})
                </TabsTrigger>
                <TabsTrigger value="cancelled" className="gap-2">
                  <XCircle className="w-4 h-4" />
                  الملغية ({cancelledOrders.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="completed" className="space-y-3 mt-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">إجمالي الإيرادات</span>
                  <span className="font-bold text-success">{totalRevenue.toLocaleString()} د.ع</span>
                </div>
                
                {completedOrders.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>لا توجد طلبات مكتملة</p>
                  </div>
                ) : (
                  completedOrders.map(order => (
                    <div 
                      key={order.id} 
                      className="bg-card border border-success/30 rounded-xl p-4 shadow-soft cursor-pointer hover:shadow-elevated transition-shadow"
                      onClick={() => setSelectedOrder(order)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold text-primary">#{order.orderNumber}</span>
                          <span className="px-2 py-0.5 rounded-full text-xs bg-success/10 text-success">مكتمل</span>
                        </div>
                        <span className="font-bold text-success">{order.totalPrice.toLocaleString()} د.ع</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {order.customer.name} • {format(new Date(order.createdAt), 'HH:mm', { locale: ar })}
                      </div>
                    </div>
                  ))
                )}
              </TabsContent>

              <TabsContent value="cancelled" className="space-y-3 mt-4">
                {/* Cancellation Summary */}
                {Object.keys(cancellationReasonStats).length > 0 && (
                  <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-3">
                    <p className="text-sm font-medium text-destructive mb-2">ملخص الأسباب</p>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(cancellationReasonStats).map(([reason, count]) => (
                        <span key={reason} className="px-2 py-1 bg-card rounded-lg text-xs">
                          {reason}: <strong>{count}</strong>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {cancelledOrders.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <XCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>لا توجد طلبات ملغية</p>
                  </div>
                ) : (
                  cancelledOrders.map(order => (
                    <div 
                      key={order.id} 
                      className="bg-card border border-destructive/30 rounded-xl p-4 shadow-soft cursor-pointer hover:shadow-elevated transition-shadow"
                      onClick={() => setSelectedOrder(order)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold text-primary">#{order.orderNumber}</span>
                          <span className="px-2 py-0.5 rounded-full text-xs bg-destructive/10 text-destructive">ملغي</span>
                        </div>
                        <span className="font-bold text-destructive">{order.totalPrice.toLocaleString()} د.ع</span>
                      </div>
                      {order.cancellationReason && (
                        <p className="text-sm text-destructive mb-1">السبب: {order.cancellationReason}</p>
                      )}
                      <div className="text-sm text-muted-foreground">
                        {order.customer.name} • {format(new Date(order.createdAt), 'HH:mm', { locale: ar })}
                      </div>
                    </div>
                  ))
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* STATS TAB - Statistics & Analytics */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'stats' && (
          <div className="space-y-4">
            {/* Sub-tabs */}
            <Tabs value={statsSubTab} onValueChange={(v) => setStatsSubTab(v as StatsSubTab)}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview" className="text-xs px-2">نظرة عامة</TabsTrigger>
                <TabsTrigger value="items" className="text-xs px-2">المبيعات</TabsTrigger>
                <TabsTrigger value="customers" className="text-xs px-2">الزبائن</TabsTrigger>
                <TabsTrigger value="finance" className="text-xs px-2">المالية</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4 mt-4">
                {/* KPI Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <KPICard title="معدل التجهيز" value={avgPrepTime} suffix="دقيقة" icon={<Timer className="w-5 h-5" />} />
                  <KPICard title="معدل التوصيل" value={avgDeliveryTime} suffix="دقيقة" icon={<Truck className="w-5 h-5" />} />
                  <KPICard title="أسرع توصيل" value={fastestDelivery} suffix="دقيقة" icon={<Zap className="w-5 h-5" />} variant="success" />
                  <KPICard title="أبطأ توصيل" value={slowestDelivery} suffix="دقيقة" icon={<AlertTriangle className="w-5 h-5" />} variant="warning" />
                  <KPICard title="متوسط الطلب" value={Math.round(averageOrderValue)} suffix="د.ع" icon={<TrendingUp className="w-5 h-5" />} variant="info" />
                  <KPICard title="العملاء" value={uniqueCustomers} icon={<Users className="w-5 h-5" />} />
                </div>
                <WeeklyChart orders={orders} />
              </TabsContent>

              <TabsContent value="items" className="space-y-4 mt-4">
                {/* Items Summary */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-card border border-border rounded-xl p-3 shadow-soft">
                    <p className="text-muted-foreground text-xs">إجمالي المباع</p>
                    <p className="text-xl font-bold text-primary">
                      {sortedItems.reduce((sum, [, s]) => sum + s.quantity, 0)}
                    </p>
                  </div>
                  <div className="bg-card border border-border rounded-xl p-3 shadow-soft">
                    <p className="text-muted-foreground text-xs">أنواع الأصناف</p>
                    <p className="text-xl font-bold text-info">{sortedItems.length}</p>
                  </div>
                </div>

                {/* Items Table */}
                <div className="bg-card border border-border rounded-xl shadow-soft overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-right p-3 font-semibold">#</th>
                          <th className="text-right p-3 font-semibold">الصنف</th>
                          <th className="text-right p-3 font-semibold">الكمية</th>
                          <th className="text-right p-3 font-semibold">الإيراد</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedItems.map(([name, stats], idx) => (
                          <tr key={name} className="border-t border-border">
                            <td className="p-3">{idx + 1}</td>
                            <td className="p-3 font-medium">{name}</td>
                            <td className="p-3 text-success">{stats.quantity}</td>
                            <td className="p-3 font-bold text-primary">{stats.revenue.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="customers" className="mt-4">
                <CustomerAnalytics orders={orders} />
              </TabsContent>

              <TabsContent value="finance" className="mt-4">
                <FinanceBreakdown orders={orders} />
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* DELIVERY TAB - Drivers Performance */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'delivery' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Truck className="w-6 h-6 text-primary" />
              أداء السائقين
            </h2>
            <DriverPerformance orders={orders} />
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* SETTINGS TAB - Settings, Users, Cancellation Reasons */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'settings' && (
          <div className="space-y-4">
            {/* Sub-tabs */}
            <Tabs value={settingsSubTab} onValueChange={(v) => setSettingsSubTab(v as SettingsSubTab)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="general" className="gap-1">
                  <Settings className="w-4 h-4" />
                  عام
                </TabsTrigger>
                <TabsTrigger value="users" className="gap-1">
                  <Users className="w-4 h-4" />
                  المستخدمين
                </TabsTrigger>
                <TabsTrigger value="reasons" className="gap-1">
                  <ClipboardList className="w-4 h-4" />
                  الأسباب
                </TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="space-y-3 mt-4">
                <Button variant="outline" size="lg" className="w-full justify-start h-auto py-4">
                  <Settings className="w-5 h-5 ml-3" />
                  <div className="text-right">
                    <p className="font-semibold">إعدادات النظام</p>
                    <p className="text-sm text-muted-foreground">تخصيص إعدادات التطبيق</p>
                  </div>
                </Button>
                
                <Button 
                  variant="outline" 
                  size="lg" 
                  className="w-full justify-start h-auto py-4 border-destructive/30 hover:bg-destructive/10"
                  onClick={handleResetShift}
                >
                  <RefreshCcw className="w-5 h-5 ml-3 text-destructive" />
                  <div className="text-right">
                    <p className="font-semibold text-destructive">إعادة ضبط الشفت</p>
                    <p className="text-sm text-muted-foreground">إعادة العداد وتصفير الإحصائيات</p>
                  </div>
                </Button>
                
                <Button 
                  variant="destructive" 
                  size="lg" 
                  className="w-full justify-start h-auto py-4"
                  onClick={logout}
                >
                  <LogOut className="w-5 h-5 ml-3" />
                  <div className="text-right">
                    <p className="font-semibold">تسجيل خروج</p>
                    <p className="text-sm text-destructive-foreground/70">الخروج من الحساب</p>
                  </div>
                </Button>
              </TabsContent>

              <TabsContent value="users" className="mt-4">
                <UserManagement />
              </TabsContent>

              <TabsContent value="reasons" className="mt-4">
                <CancellationReasonsManager />
              </TabsContent>
            </Tabs>
          </div>
        )}
      </main>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* BOTTOM NAVIGATION - 5 Main Tabs Only */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border shadow-elevated safe-area-pb">
        <div className="container">
          <div className="flex justify-around items-center">
            {mainTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-3 flex flex-col items-center gap-1 transition-all ${
                  activeTab === tab.id 
                    ? 'text-primary' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <div className={`p-1.5 rounded-lg transition-colors ${
                  activeTab === tab.id ? 'bg-primary/10' : ''
                }`}>
                  {tab.icon}
                </div>
                <span className="text-xs font-medium">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Order Details Dialog */}
      <OrderDetailsDialog
        order={selectedOrder}
        open={!!selectedOrder}
        onOpenChange={(open) => !open && setSelectedOrder(null)}
      />
    </div>
  );
}
