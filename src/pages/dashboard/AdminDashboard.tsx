import { useState } from 'react';
import { useRole } from '@/contexts/RoleContext';
import { useAuth } from '@/contexts/AuthContext';
import { useSupabaseOrders, OrderWithItems } from '@/hooks/useSupabaseOrders';
import { useShift } from '@/contexts/ShiftContext';
import { Button } from '@/components/ui/button';
import { CancellationReasonsManager } from '@/components/CancellationReasonsManager';
import { IssueReasonsManager } from '@/components/IssueReasonsManager';
import { DeliveryAreasManager } from '@/components/admin/DeliveryAreasManager';
import { DeliveryAreaAnalytics } from '@/components/admin/DeliveryAreaAnalytics';
import { UserManagement } from '@/components/admin/UserManagement';
import { LogoutConfirmButton } from '@/components/LogoutConfirmButton';
import { KPICard } from '@/components/admin/KPICard';
import { OrdersChart, WeeklyChart } from '@/components/admin/OrdersChart';
import { ActivityLogList } from '@/components/admin/ActivityLogList';
import { CustomerAnalytics } from '@/components/admin/CustomerAnalytics';
import { FinanceBreakdown } from '@/components/admin/FinanceBreakdown';
import { MenuManagement } from '@/components/admin/MenuManagement';
import { ExecutivePulseDashboard } from '@/components/admin/ExecutivePulseDashboard';
import { BehaviorAnalysis } from '@/components/admin/BehaviorAnalysis';
import { OrderTimeline } from '@/components/admin/OrderTimeline';
import { PredictiveAnalysis } from '@/components/admin/PredictiveAnalysis';
import { toast } from 'sonner';
import { formatNumberWithCommas, formatTimeEnglish, toEnglishNumbers } from '@/lib/formatNumber';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ROLE_LABELS } from '@/types';
import { Settings, Users, BarChart3, RefreshCcw, ShieldCheck, XCircle, CheckCircle, ClipboardList, TrendingUp, DollarSign, Timer, Zap, AlertTriangle, Home, Package, Loader2, UtensilsCrossed, Truck, Trash2, Eye, Activity, Clock, GitBranch } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';

// Main navigation tabs (6 total)
type MainTab = 'home' | 'menu' | 'orders' | 'stats' | 'monitoring' | 'settings';

// Sub-tabs for each main section
type OrdersSubTab = 'completed' | 'cancelled';
type StatsSubTab = 'items' | 'customers' | 'finance' | 'areas';
type SettingsSubTab = 'general' | 'users' | 'reasons' | 'issues' | 'areas';
type MonitoringSubTab = 'pulse' | 'behavior' | 'timeline' | 'predictive';
export default function AdminDashboard() {
  const {
    role
  } = useRole();
  const {
    user
  } = useAuth();
  const {
    orders,
    loading,
    refetch
  } = useSupabaseOrders({ orderTypeFilter: 'all' });
  const {
    activityLogs,
    addActivityLog
  } = useShift();
  const [activeTab, setActiveTab] = useState<MainTab>('home');
  const [ordersSubTab, setOrdersSubTab] = useState<OrdersSubTab>('completed');
  const [statsSubTab, setStatsSubTab] = useState<StatsSubTab>('items');
  const [settingsSubTab, setSettingsSubTab] = useState<SettingsSubTab>('general');
  const [monitoringSubTab, setMonitoringSubTab] = useState<MonitoringSubTab>('pulse');
  const [selectedOrder, setSelectedOrder] = useState<OrderWithItems | null>(null);
  const [isDeletingOrders, setIsDeletingOrders] = useState(false);

  // Statistics calculations
  const totalOrders = orders.length;
  const completedOrders = orders.filter(o => o.status === 'delivered');
  const cancelledOrders = orders.filter(o => o.status === 'cancelled');
  const pendingOrders = orders.filter(o => o.status === 'pending');
  const inProgressOrders = orders.filter(o => ['preparing', 'ready', 'delivering'].includes(o.status));
  // Revenue = total_price - delivery_fee (only completed orders, excluding delivery fees)
  const totalRevenue = completedOrders.reduce((sum, o) => sum + (Number(o.total_price) - Number(o.delivery_fee || 0)), 0);
  const cancelledRevenue = cancelledOrders.reduce((sum, o) => sum + (Number(o.total_price) - Number(o.delivery_fee || 0)), 0);
  const averageOrderValue = completedOrders.length > 0 ? totalRevenue / completedOrders.length : 0;

  // Simulated time stats
  const avgPrepTime = 12;
  const avgDeliveryTime = 28;
  const fastestDelivery = 15;
  const slowestDelivery = 45;

  // Count items sold
  const itemsStats: Record<string, {
    quantity: number;
    revenue: number;
    price: number;
    category: string;
  }> = {};
  completedOrders.forEach(order => {
    order.items.forEach(item => {
      const key = item.menu_item_name;
      if (!itemsStats[key]) {
        itemsStats[key] = {
          quantity: 0,
          revenue: 0,
          price: Number(item.menu_item_price),
          category: ''
        };
      }
      itemsStats[key].quantity += item.quantity;
      itemsStats[key].revenue += Number(item.menu_item_price) * item.quantity;
    });
  });
  const sortedItems = Object.entries(itemsStats).sort(([, a], [, b]) => b.quantity - a.quantity);

  // Cancellation reasons stats
  const cancellationReasonStats: Record<string, number> = {};
  cancelledOrders.forEach(order => {
    const reason = order.cancellation_reason || 'بدون سبب';
    cancellationReasonStats[reason] = (cancellationReasonStats[reason] || 0) + 1;
  });

  // Unique customers
  const uniqueCustomers = new Set(orders.map(o => o.customer_phone)).size;
  const newCustomers = orders.filter((o, idx, arr) => arr.findIndex(x => x.customer_phone === o.customer_phone) === idx).length;
  const handleRefresh = () => {
    refetch();
    toast.success('تم تحديث البيانات');
  };
  const handleDeleteAllOrders = async () => {
    setIsDeletingOrders(true);
    try {
      // First delete all order_items
      const { error: itemsError } = await supabase.from('order_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (itemsError) throw itemsError;
      
      // Then delete all orders
      const { error: ordersError } = await supabase.from('orders').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (ordersError) throw ordersError;
      
      // Reset order counter to 1
      const { error: resetError } = await supabase.rpc('reset_order_sequence');
      if (resetError) {
        console.error('Error resetting order counter:', resetError);
      }
      
      toast.success('تم حذف جميع الطلبات وإعادة تعيين العداد بنجاح');
      refetch();
    } catch (error: any) {
      console.error('Error deleting orders:', error);
      toast.error('حدث خطأ أثناء حذف الطلبات');
    } finally {
      setIsDeletingOrders(false);
    }
  };

  // Main navigation tabs
  const mainTabs: {
    id: MainTab;
    label: string;
    icon: React.ReactNode;
  }[] = [{
    id: 'home',
    label: 'الرئيسية',
    icon: <Home className="w-5 h-5" />
  }, {
    id: 'menu',
    label: 'المنيو',
    icon: <UtensilsCrossed className="w-5 h-5" />
  }, {
    id: 'orders',
    label: 'الطلبات',
    icon: <Package className="w-5 h-5" />
  }, {
    id: 'stats',
    label: 'الإحصائيات',
    icon: <BarChart3 className="w-5 h-5" />
  }, {
    id: 'monitoring',
    label: 'الرقابة',
    icon: <Eye className="w-5 h-5" />
  }, {
    id: 'settings',
    label: 'الإعدادات',
    icon: <Settings className="w-5 h-5" />
  }];

  // Transform orders for charts (compatibility)
  const ordersForCharts = orders.map(o => ({
    ...o,
    orderNumber: o.order_number,
    totalPrice: Number(o.total_price),
    deliveryFee: Number(o.delivery_fee || 0),
    createdAt: new Date(o.created_at),
    customer: {
      name: o.customer_name,
      phone: o.customer_phone,
      address: o.customer_address || ''
    },
    items: o.items.map(i => ({
      menuItem: {
        id: i.menu_item_id || '',
        name: i.menu_item_name,
        price: Number(i.menu_item_price),
        image: '',
        category: ''
      },
      quantity: i.quantity,
      notes: i.notes || undefined
    })),
    cashierName: o.cashier_name || ''
  }));
  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>;
  }
  return <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border shadow-soft sticky top-0 z-50">
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-bold text-foreground text-sm">المدير التنفيذي</h1>
              <p className="text-xs text-muted-foreground">{user?.fullName || user?.username || ''}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-4 pb-24">
        
        {/* HOME TAB - Dashboard Overview */}
        {activeTab === 'home' && <div className="space-y-4">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KPICard title="إجمالي الطلبات" value={totalOrders} icon={<ClipboardList className="w-5 h-5" />} />
              <KPICard title="المكتملة" value={completedOrders.length} icon={<CheckCircle className="w-5 h-5" />} variant="success" />
              <KPICard title="الملغية" value={cancelledOrders.length} icon={<XCircle className="w-5 h-5" />} variant="destructive" />
              <KPICard title="الإيرادات" value={totalRevenue} suffix="د.ع" icon={<DollarSign className="w-5 h-5" />} variant="success" />
            </div>

            {/* Charts */}
            <OrdersChart orders={ordersForCharts} />

            {/* Top Items Quick View */}
            <div className="bg-card border border-border rounded-xl p-4 shadow-soft">
              <h3 className="font-bold mb-3 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                أكثر الأصناف مبيعاً
              </h3>
              {sortedItems.length === 0 ? <p className="text-muted-foreground text-center py-4">لا توجد بيانات</p> : <div className="space-y-2">
                  {sortedItems.slice(0, 5).map(([name, stats], idx) => <div key={name} className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg">
                      <span className="w-7 h-7 flex items-center justify-center bg-primary/10 text-primary rounded-lg font-bold text-sm">
                        {idx + 1}
                      </span>
                      <span className="flex-1 font-medium">{name}</span>
                      <span className="font-bold text-primary">{stats.quantity}</span>
                    </div>)}
                </div>}
            </div>

            {/* Activity Log */}
            <ActivityLogList logs={activityLogs} />
          </div>}

        {/* MENU TAB - Quick Menu Management */}
        {activeTab === 'menu' && <div className="space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <UtensilsCrossed className="w-6 h-6 text-primary" />
              إدارة المنيو السريع
            </h2>
            <MenuManagement />
          </div>}

        {/* ORDERS TAB - Completed & Cancelled Orders */}
        {activeTab === 'orders' && <div className="space-y-4">
            {/* Sub-tabs */}
            <Tabs value={ordersSubTab} onValueChange={v => setOrdersSubTab(v as OrdersSubTab)}>
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
                  <span className="font-bold text-success">{formatNumberWithCommas(totalRevenue)} د.ع</span>
                </div>
                
                {completedOrders.length === 0 ? <div className="text-center py-12 text-muted-foreground">
                    <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>لا توجد طلبات مكتملة</p>
                  </div> : completedOrders.map(order => <div key={order.id} className="bg-card border border-success/30 rounded-xl p-4 shadow-soft cursor-pointer hover:shadow-elevated transition-shadow" onClick={() => setSelectedOrder(order)}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold text-primary">#{toEnglishNumbers(order.order_number)}</span>
                          <span className="px-2 py-0.5 rounded-full text-xs bg-success/10 text-success">مكتمل</span>
                        </div>
                        <span className="font-bold text-success">{formatNumberWithCommas(Number(order.total_price))} د.ع</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {order.customer_name} • {formatTimeEnglish(order.created_at)}
                      </div>
                    </div>)}
              </TabsContent>

              <TabsContent value="cancelled" className="space-y-3 mt-4">
                {/* Cancellation Summary */}
                {Object.keys(cancellationReasonStats).length > 0 && <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-3">
                    <p className="text-sm font-medium text-destructive mb-2">ملخص الأسباب</p>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(cancellationReasonStats).map(([reason, count]) => <span key={reason} className="px-2 py-1 bg-card rounded-lg text-xs">
                          {reason}: <strong>{toEnglishNumbers(count)}</strong>
                        </span>)}
                    </div>
                  </div>}
                
                {cancelledOrders.length === 0 ? <div className="text-center py-12 text-muted-foreground">
                    <XCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>لا توجد طلبات ملغية</p>
                  </div> : cancelledOrders.map(order => <div key={order.id} className="bg-card border border-destructive/30 rounded-xl p-4 shadow-soft cursor-pointer hover:shadow-elevated transition-shadow" onClick={() => setSelectedOrder(order)}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold text-primary">#{toEnglishNumbers(order.order_number)}</span>
                          <span className="px-2 py-0.5 rounded-full text-xs bg-destructive/10 text-destructive">ملغي</span>
                        </div>
                        <span className="font-bold text-destructive">{formatNumberWithCommas(Number(order.total_price))} د.ع</span>
                      </div>
                      {order.cancellation_reason && <p className="text-sm text-destructive mb-1">السبب: {order.cancellation_reason}</p>}
                      <div className="text-sm text-muted-foreground">
                        {order.customer_name} • {formatTimeEnglish(order.created_at)}
                      </div>
                    </div>)}
              </TabsContent>
            </Tabs>
          </div>}

        {/* STATS TAB - Statistics & Analytics */}
        {activeTab === 'stats' && <div className="space-y-4">
            {/* Sub-tabs */}
            <Tabs value={statsSubTab} onValueChange={v => setStatsSubTab(v as StatsSubTab)}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="items" className="text-xs px-1">المبيعات</TabsTrigger>
                <TabsTrigger value="areas" className="text-xs px-1">المناطق</TabsTrigger>
                <TabsTrigger value="customers" className="text-xs px-1">الزبائن</TabsTrigger>
                <TabsTrigger value="finance" className="text-xs px-1">المالية</TabsTrigger>
              </TabsList>

              <TabsContent value="items" className="space-y-4 mt-4">
                {/* Items Summary */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-card border border-border rounded-xl p-3 shadow-soft">
                    <p className="text-muted-foreground text-xs">إجمالي المباع</p>
                    <p className="text-2xl font-bold text-primary">
                      {toEnglishNumbers(sortedItems.reduce((sum, [, s]) => sum + s.quantity, 0))}
                    </p>
                  </div>
                  <div className="bg-card border border-border rounded-xl p-3 shadow-soft">
                    <p className="text-muted-foreground text-xs">إجمالي الإيرادات</p>
                    <p className="text-2xl font-bold text-success">
                      {formatNumberWithCommas(sortedItems.reduce((sum, [, s]) => sum + s.revenue, 0))}
                    </p>
                  </div>
                </div>

                {/* Top Items */}
                <div className="bg-card border border-border rounded-xl p-4 shadow-soft">
                  <h3 className="font-bold mb-3 text-success">الأكثر مبيعاً</h3>
                  <div className="space-y-2">
                    {sortedItems.slice(0, 5).map(([name, stats], idx) => <div key={name} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 flex items-center justify-center bg-success/10 text-success rounded font-bold text-xs">
                            {toEnglishNumbers(idx + 1)}
                          </span>
                          <span className="font-medium text-sm">{name}</span>
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-bold">{toEnglishNumbers(stats.quantity)}</p>
                          <p className="text-xs text-muted-foreground">{formatNumberWithCommas(stats.revenue)} د.ع</p>
                        </div>
                      </div>)}
                  </div>
                </div>

                {/* Worst Items */}
                <div className="bg-card border border-border rounded-xl p-4 shadow-soft">
                  <h3 className="font-bold mb-3 text-destructive">الأقل مبيعاً</h3>
                  <div className="space-y-2">
                    {sortedItems.slice(-3).reverse().map(([name, stats], idx) => <div key={name} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 flex items-center justify-center bg-destructive/10 text-destructive rounded font-bold text-xs">
                            {toEnglishNumbers(sortedItems.length - idx)}
                          </span>
                          <span className="font-medium text-sm">{name}</span>
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-bold">{toEnglishNumbers(stats.quantity)}</p>
                          <p className="text-xs text-muted-foreground">{formatNumberWithCommas(stats.revenue)} د.ع</p>
                        </div>
                      </div>)}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="areas" className="mt-4">
                <DeliveryAreaAnalytics orders={orders} />
              </TabsContent>

              <TabsContent value="customers" className="mt-4">
                <CustomerAnalytics orders={ordersForCharts} />
              </TabsContent>

              <TabsContent value="finance" className="mt-4">
                <FinanceBreakdown orders={ordersForCharts} />
              </TabsContent>
            </Tabs>
          </div>}


        {/* MONITORING TAB - Executive Oversight */}
        {activeTab === 'monitoring' && <div className="space-y-4">
            {/* Sub-tabs */}
            <Tabs value={monitoringSubTab} onValueChange={v => setMonitoringSubTab(v as MonitoringSubTab)}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="pulse" className="text-xs px-1 gap-1">
                  <Activity className="w-3 h-3" />
                  النبض
                </TabsTrigger>
                <TabsTrigger value="behavior" className="text-xs px-1 gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  الأنماط
                </TabsTrigger>
                <TabsTrigger value="timeline" className="text-xs px-1 gap-1">
                  <Clock className="w-3 h-3" />
                  الخط الزمني
                </TabsTrigger>
                <TabsTrigger value="predictive" className="text-xs px-1 gap-1">
                  <TrendingUp className="w-3 h-3" />
                  التنبؤي
                </TabsTrigger>
              </TabsList>

              <TabsContent value="pulse" className="mt-4">
                <ExecutivePulseDashboard orders={orders} />
              </TabsContent>

              <TabsContent value="behavior" className="mt-4">
                <BehaviorAnalysis orders={orders} />
              </TabsContent>

              <TabsContent value="timeline" className="mt-4">
                <OrderTimeline orders={orders} />
              </TabsContent>

              <TabsContent value="predictive" className="mt-4">
                <PredictiveAnalysis orders={orders} />
              </TabsContent>
            </Tabs>
          </div>}

        {/* SETTINGS TAB - Configuration & Management */}
        {activeTab === 'settings' && <div className="space-y-4">
            {/* Sub-tabs */}
            <Tabs value={settingsSubTab} onValueChange={v => setSettingsSubTab(v as SettingsSubTab)}>
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="general" className="text-xs px-1">عام</TabsTrigger>
                <TabsTrigger value="users" className="text-xs px-1">المستخدمين</TabsTrigger>
                <TabsTrigger value="areas" className="text-xs px-1">المناطق</TabsTrigger>
                <TabsTrigger value="reasons" className="text-xs px-1">الإلغاء</TabsTrigger>
                <TabsTrigger value="issues" className="text-xs px-1">التبليغ</TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="space-y-4 mt-4">
                <Button variant="outline" size="lg" className="w-full justify-start h-auto py-4">
                  <Settings className="w-5 h-5 ml-3" />
                  <div className="text-right">
                    <p className="font-semibold">إعدادات النظام</p>
                    <p className="text-sm text-muted-foreground">تخصيص إعدادات التطبيق</p>
                  </div>
                </Button>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="lg" className="w-full justify-start h-auto py-4 border-2 border-destructive bg-destructive/10 hover:bg-destructive/20 text-destructive hover:text-destructive">
                      <Trash2 className="w-6 h-6 ml-3" />
                      <div className="text-right">
                        <p className="font-bold text-lg">حذف جميع الطلبات</p>
                      </div>
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle className="flex items-center gap-2">
                        <Trash2 className="w-5 h-5 text-destructive" />
                        حذف جميع الطلبات
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        سيتم حذف جميع الطلبات ({orders.length} طلب) نهائياً من قاعدة البيانات. هذا الإجراء لا يمكن التراجع عنه!
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex-row-reverse gap-2">
                      <AlertDialogCancel>إلغاء</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDeleteAllOrders} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={isDeletingOrders}>
                        {isDeletingOrders ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Trash2 className="w-4 h-4 ml-2" />}
                        حذف الكل
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                
                <LogoutConfirmButton />
              </TabsContent>


              <TabsContent value="users" className="mt-4">
                <UserManagement />
              </TabsContent>

              <TabsContent value="areas" className="mt-4">
                <DeliveryAreasManager />
              </TabsContent>

              <TabsContent value="reasons" className="mt-4">
                <CancellationReasonsManager />
              </TabsContent>

              <TabsContent value="issues" className="mt-4">
                <IssueReasonsManager />
              </TabsContent>
            </Tabs>
          </div>}
      </main>

      {/* BOTTOM NAVIGATION - 5 Main Tabs Only */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border shadow-elevated safe-area-pb">
        <div className="container">
          <div className="flex justify-around items-center">
            {mainTabs.map(tab => <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex-1 py-3 flex flex-col items-center gap-1 transition-all ${activeTab === tab.id ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
                <div className={`p-1.5 rounded-lg transition-colors ${activeTab === tab.id ? 'bg-primary/10' : ''}`}>
                  {tab.icon}
                </div>
                <span className="text-xs font-medium">{tab.label}</span>
              </button>)}
          </div>
        </div>
      </nav>

      {/* Order Details Dialog */}
      {selectedOrder && <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedOrder(null)}>
          <div className="bg-card rounded-xl p-6 max-w-md w-full max-h-[80vh] overflow-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4">تفاصيل الطلب <span className="text-primary px-2 py-0.5 border-2 border-primary/30 rounded-lg bg-primary/5">{selectedOrder.order_number}</span></h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">الزبون</p>
                <p className="font-semibold">{selectedOrder.customer_name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">العنوان</p>
                <p className="font-semibold">{selectedOrder.customer_address || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">الهاتف</p>
                <p className="font-semibold">{selectedOrder.customer_phone || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">الأصناف</p>
                <div className="space-y-1 mt-1">
                  {selectedOrder.items.map((item, idx) => <div key={idx} className="flex justify-between text-sm">
                      <span>{item.menu_item_name} × {item.quantity}</span>
                      <span>{(Number(item.menu_item_price) * item.quantity).toLocaleString()} د.ع</span>
                    </div>)}
                </div>
              </div>
              <div className="pt-2 border-t">
                <div className="flex justify-between font-bold">
                  <span>المجموع</span>
                  <span className="text-primary">{Number(selectedOrder.total_price).toLocaleString()} د.ع</span>
                </div>
              </div>
            </div>
            <Button className="w-full mt-4" onClick={() => setSelectedOrder(null)}>إغلاق</Button>
          </div>
        </div>}
    </div>;
}