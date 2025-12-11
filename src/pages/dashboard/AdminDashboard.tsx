import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useOrders, MENU_ITEMS } from '@/contexts/OrderContext';
import { useShift } from '@/contexts/ShiftContext';
import { Order, ORDER_STATUS_LABELS } from '@/types';
import { Button } from '@/components/ui/button';
import { CancellationReasonsManager } from '@/components/CancellationReasonsManager';
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
  AlertTriangle
} from 'lucide-react';

type TabType = 'overview' | 'charts' | 'drivers' | 'customers' | 'finance' | 'completed' | 'cancelled' | 'items' | 'activity' | 'users' | 'cancellation' | 'settings';

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const { orders } = useOrders();
  const { currentShift, previousShift, activityLogs, lastUpdated, resetShift, addActivityLog } = useShift();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

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
  const avgPrepTime = 12; // minutes
  const avgDeliveryTime = 28; // minutes
  const fastestDelivery = 15;
  const slowestDelivery = 45;

  // Count items sold with details
  const itemsStats: Record<string, { quantity: number; revenue: number; price: number; category: string }> = {};
  completedOrders.forEach(order => {
    order.items.forEach(item => {
      const key = item.menuItem.name;
      if (!itemsStats[key]) {
        itemsStats[key] = { 
          quantity: 0, 
          revenue: 0, 
          price: item.menuItem.price,
          category: item.menuItem.category 
        };
      }
      itemsStats[key].quantity += item.quantity;
      itemsStats[key].revenue += item.menuItem.price * item.quantity;
    });
  });

  const sortedItems = Object.entries(itemsStats)
    .sort(([, a], [, b]) => b.quantity - a.quantity);

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
    setRefreshKey(prev => prev + 1);
    toast.success('تم تحديث البيانات');
  };

  // Calculate trend compared to previous shift
  const getTrend = (current: number, previous: number | undefined) => {
    if (!previous || previous === 0) return 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'نظرة عامة', icon: <BarChart3 className="w-5 h-5" /> },
    { id: 'charts', label: 'الرسوم', icon: <PieChart className="w-5 h-5" /> },
    { id: 'drivers', label: 'السائقين', icon: <Truck className="w-5 h-5" /> },
    { id: 'customers', label: 'الزبائن', icon: <Users className="w-5 h-5" /> },
    { id: 'finance', label: 'المالية', icon: <DollarSign className="w-5 h-5" /> },
    { id: 'completed', label: 'المكتملة', icon: <CheckCircle className="w-5 h-5" /> },
    { id: 'cancelled', label: 'الملغية', icon: <XCircle className="w-5 h-5" /> },
    { id: 'items', label: 'المبيعات', icon: <ShoppingBag className="w-5 h-5" /> },
    { id: 'activity', label: 'السجل', icon: <Activity className="w-5 h-5" /> },
    { id: 'users', label: 'المستخدمين', icon: <Users className="w-5 h-5" /> },
    { id: 'cancellation', label: 'الأسباب', icon: <ClipboardList className="w-5 h-5" /> },
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
              <h1 className="font-bold text-foreground">لوحة التحكم التنفيذية</h1>
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
        {/* Shift Header - Always visible */}
        <ShiftHeader
          restaurantName="مطعمي"
          branchName="الفرع الرئيسي"
          shiftNumber={currentShift.shiftNumber}
          shiftStartTime={currentShift.startTime}
          lastUpdated={lastUpdated}
          onReset={handleResetShift}
          onRefresh={handleRefresh}
        />

        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* KPI Cards Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
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
                title="قيد الانتظار"
                value={pendingOrders.length}
                icon={<Clock className="w-5 h-5" />}
                variant="warning"
              />
              <KPICard
                title="قيد المعالجة"
                value={inProgressOrders.length}
                icon={<Zap className="w-5 h-5" />}
                variant="info"
              />
              <KPICard
                title="معدل التجهيز"
                value={avgPrepTime}
                suffix="دقيقة"
                icon={<Timer className="w-5 h-5" />}
              />
              <KPICard
                title="معدل التوصيل"
                value={avgDeliveryTime}
                suffix="دقيقة"
                icon={<Truck className="w-5 h-5" />}
              />
              <KPICard
                title="أسرع توصيل"
                value={fastestDelivery}
                suffix="دقيقة"
                icon={<Zap className="w-5 h-5" />}
                variant="success"
              />
              <KPICard
                title="أبطأ توصيل"
                value={slowestDelivery}
                suffix="دقيقة"
                icon={<AlertTriangle className="w-5 h-5" />}
                variant="warning"
              />
              <KPICard
                title="إجمالي الإيرادات"
                value={totalRevenue}
                suffix="د.ع"
                icon={<DollarSign className="w-5 h-5" />}
                variant="success"
              />
              <KPICard
                title="العملاء اليوم"
                value={uniqueCustomers}
                icon={<Users className="w-5 h-5" />}
              />
              <KPICard
                title="عملاء جدد"
                value={newCustomers}
                icon={<UserPlus className="w-5 h-5" />}
                variant="success"
              />
              <KPICard
                title="متوسط الطلب"
                value={Math.round(averageOrderValue)}
                suffix="د.ع"
                icon={<TrendingUp className="w-5 h-5" />}
                variant="info"
              />
            </div>

            {/* Quick Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <OrdersChart orders={orders} />
              <WeeklyChart orders={orders} />
            </div>

            {/* Top Items */}
            <div className="bg-card border border-border rounded-xl p-4 shadow-soft">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                أكثر الأصناف مبيعاً
              </h3>
              {sortedItems.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">لا توجد بيانات</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {sortedItems.slice(0, 6).map(([name, stats], idx) => (
                    <div key={name} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <span className="w-8 h-8 flex items-center justify-center bg-primary/10 text-primary rounded-lg font-bold">
                        {idx + 1}
                      </span>
                      <div className="flex-1">
                        <p className="font-semibold text-foreground">{name}</p>
                        <p className="text-xs text-muted-foreground">{stats.category}</p>
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-primary">{stats.quantity}</p>
                        <p className="text-xs text-muted-foreground">{stats.revenue.toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'charts' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <PieChart className="w-6 h-6 text-primary" />
              الرسوم البيانية والتحليلات
            </h2>
            <OrdersChart orders={orders} title="توزيع الطلبات حسب الساعة" />
            <WeeklyChart orders={orders} />
          </div>
        )}

        {activeTab === 'drivers' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Truck className="w-6 h-6 text-primary" />
              أداء السائقين
            </h2>
            <DriverPerformance orders={orders} />
          </div>
        )}

        {activeTab === 'customers' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Users className="w-6 h-6 text-primary" />
              تحليلات العملاء
            </h2>
            <CustomerAnalytics orders={orders} />
          </div>
        )}

        {activeTab === 'finance' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <DollarSign className="w-6 h-6 text-primary" />
              التقرير المالي
            </h2>
            <FinanceBreakdown orders={orders} />
          </div>
        )}

        {activeTab === 'completed' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <CheckCircle className="w-6 h-6 text-success" />
                الطلبات المكتملة ({completedOrders.length})
              </h2>
              <div className="text-sm text-muted-foreground">
                إجمالي: {totalRevenue.toLocaleString()} د.ع
              </div>
            </div>
            
            {completedOrders.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>لا توجد طلبات مكتملة</p>
              </div>
            ) : (
              <div className="space-y-3">
                {completedOrders.map(order => (
                  <div 
                    key={order.id} 
                    className="bg-card border border-success/30 rounded-xl p-4 shadow-soft hover:shadow-elevated transition-shadow cursor-pointer"
                    onClick={() => setSelectedOrder(order)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className="text-xl font-bold text-primary">#{order.orderNumber}</span>
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-success/10 text-success border border-success/30">
                          مكتمل
                        </span>
                        {order.type === 'takeaway' && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-warning/20 text-warning">
                            سفري
                          </span>
                        )}
                      </div>
                      <Button variant="ghost" size="sm">
                        <Eye className="w-4 h-4 ml-1" />
                        عرض
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                      <div>
                        <p className="text-muted-foreground">الزبون</p>
                        <p className="font-medium">{order.customer.name}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">المبلغ</p>
                        <p className="font-medium text-success">{order.totalPrice.toLocaleString()} د.ع</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">التاريخ</p>
                        <p className="font-medium">{format(new Date(order.createdAt), 'yyyy/MM/dd', { locale: ar })}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">الكاشير</p>
                        <p className="font-medium">{order.cashierName}</p>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      العناصر: {order.items.map(i => `${i.menuItem.name} (${i.quantity})`).join('، ')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'cancelled' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <XCircle className="w-6 h-6 text-destructive" />
                الطلبات الملغية ({cancelledOrders.length})
              </h2>
              <div className="text-sm text-destructive">
                خسائر: {cancelledRevenue.toLocaleString()} د.ع
              </div>
            </div>

            {/* Cancellation Reasons Summary */}
            {Object.keys(cancellationReasonStats).length > 0 && (
              <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-4">
                <h3 className="font-semibold mb-3 text-destructive">ملخص أسباب الإلغاء</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {Object.entries(cancellationReasonStats).map(([reason, count]) => (
                    <div key={reason} className="bg-card rounded-lg p-2 text-center">
                      <p className="text-lg font-bold text-destructive">{count}</p>
                      <p className="text-xs text-muted-foreground">{reason}</p>
                    </div>
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
              <div className="space-y-3">
                {cancelledOrders.map(order => (
                  <div 
                    key={order.id} 
                    className="bg-card border border-destructive/30 rounded-xl p-4 shadow-soft hover:shadow-elevated transition-shadow cursor-pointer"
                    onClick={() => setSelectedOrder(order)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className="text-xl font-bold text-primary">#{order.orderNumber}</span>
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-destructive/10 text-destructive border border-destructive/30">
                          ملغي
                        </span>
                      </div>
                      <Button variant="ghost" size="sm">
                        <Eye className="w-4 h-4 ml-1" />
                        عرض
                      </Button>
                    </div>
                    {order.cancellationReason && (
                      <div className="mb-2 p-2 bg-destructive/10 rounded-lg">
                        <p className="text-sm text-destructive">
                          <XCircle className="w-4 h-4 inline ml-1" />
                          سبب الإلغاء: {order.cancellationReason}
                        </p>
                      </div>
                    )}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                      <div>
                        <p className="text-muted-foreground">الزبون</p>
                        <p className="font-medium">{order.customer.name}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">المبلغ</p>
                        <p className="font-medium text-destructive">{order.totalPrice.toLocaleString()} د.ع</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">التاريخ</p>
                        <p className="font-medium">{format(new Date(order.createdAt), 'yyyy/MM/dd', { locale: ar })}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">الكاشير</p>
                        <p className="font-medium">{order.cashierName}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'items' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <ShoppingBag className="w-6 h-6 text-primary" />
              تفاصيل مبيعات الأصناف
            </h2>
            
            {sortedItems.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <ShoppingBag className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>لا توجد مبيعات بعد</p>
              </div>
            ) : (
              <>
                {/* Summary */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-card border border-border rounded-xl p-4 shadow-soft">
                    <p className="text-muted-foreground text-sm">إجمالي الأصناف المباعة</p>
                    <p className="text-2xl font-bold text-primary">
                      {sortedItems.reduce((sum, [, s]) => sum + s.quantity, 0)} قطعة
                    </p>
                  </div>
                  <div className="bg-card border border-border rounded-xl p-4 shadow-soft">
                    <p className="text-muted-foreground text-sm">عدد أنواع الأصناف</p>
                    <p className="text-2xl font-bold text-info">{sortedItems.length} صنف</p>
                  </div>
                  <div className="bg-card border border-border rounded-xl p-4 shadow-soft">
                    <p className="text-muted-foreground text-sm">أكثر صنف مبيعاً</p>
                    <p className="text-lg font-bold text-success">{sortedItems[0]?.[0] || '-'}</p>
                  </div>
                  <div className="bg-card border border-border rounded-xl p-4 shadow-soft">
                    <p className="text-muted-foreground text-sm">أقل صنف مبيعاً</p>
                    <p className="text-lg font-bold text-warning">{sortedItems[sortedItems.length - 1]?.[0] || '-'}</p>
                  </div>
                </div>

                {/* All Items Table */}
                <div className="bg-card border border-border rounded-xl shadow-soft overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-right p-3 font-semibold">#</th>
                          <th className="text-right p-3 font-semibold">الصنف</th>
                          <th className="text-right p-3 font-semibold">التصنيف</th>
                          <th className="text-right p-3 font-semibold">السعر</th>
                          <th className="text-right p-3 font-semibold">الكمية المباعة</th>
                          <th className="text-right p-3 font-semibold">إجمالي الإيراد</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedItems.map(([name, stats], idx) => (
                          <tr key={name} className="border-t border-border hover:bg-muted/30">
                            <td className="p-3">
                              <span className="w-7 h-7 flex items-center justify-center bg-primary/10 text-primary rounded-lg font-bold text-sm">
                                {idx + 1}
                              </span>
                            </td>
                            <td className="p-3 font-medium">{name}</td>
                            <td className="p-3 text-muted-foreground">{stats.category}</td>
                            <td className="p-3">{stats.price.toLocaleString()} د.ع</td>
                            <td className="p-3">
                              <span className="px-2 py-1 bg-success/10 text-success rounded-full text-sm font-medium">
                                {stats.quantity} قطعة
                              </span>
                            </td>
                            <td className="p-3 font-bold text-primary">{stats.revenue.toLocaleString()} د.ع</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-primary/5 font-bold">
                        <tr>
                          <td colSpan={4} className="p-3 text-left">المجموع</td>
                          <td className="p-3">{sortedItems.reduce((sum, [, s]) => sum + s.quantity, 0)} قطعة</td>
                          <td className="p-3 text-primary">{totalRevenue.toLocaleString()} د.ع</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Activity className="w-6 h-6 text-primary" />
              سجل النشاطات
            </h2>
            <ActivityLogList logs={activityLogs} />
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

      {/* Bottom Navigation - Scrollable */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border shadow-elevated">
        <div className="container overflow-x-auto">
          <div className="flex min-w-max">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-shrink-0 px-3 py-3 flex flex-col items-center gap-1 transition-colors ${
                  activeTab === tab.id ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                {tab.icon}
                <span className="text-xs font-medium whitespace-nowrap">{tab.label}</span>
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
