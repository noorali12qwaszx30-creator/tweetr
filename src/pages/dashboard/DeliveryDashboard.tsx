import { useState, useEffect, useRef } from 'react';
import { useRole } from '@/contexts/RoleContext';
import { useAuth } from '@/contexts/AuthContext';
import { useSupabaseOrders } from '@/hooks/useSupabaseOrders';
import { useCancellationReasons } from '@/contexts/CancellationReasonsContext';
import { useIssueReasons } from '@/contexts/IssueReasonsContext';
import { useNotificationPermission } from '@/hooks/useNotificationPermission';
import { OrderCard } from '@/components/OrderCard';
import { LogoutConfirmButton } from '@/components/LogoutConfirmButton';
import { DashboardHeader } from '@/components/shared/DashboardHeader';
import { BottomNavigation } from '@/components/shared/BottomNavigation';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ROLE_LABELS } from '@/types';
import { toEnglishNumbers, formatNumberWithCommas } from '@/lib/formatNumber';
import { DriverStatusToggle } from '@/components/delivery/DriverStatusToggle';
import { DeliveryOrderExtras } from '@/components/delivery/DeliveryOrderExtras';
import { OldOrderAlert } from '@/components/delivery/OldOrderAlert';
import { DriverStatsTab } from '@/components/delivery/DriverStatsTab';
import { DriverHubTab } from '@/components/delivery/driver-hub/DriverHubTab';
import { useDeliveryAreas } from '@/hooks/useDeliveryAreas';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  Truck,
  ClipboardList,
  BarChart3,
  CheckCircle,
  XCircle,
  Phone,
  MessageCircle,
  Undo2,
  Loader2,
  Settings,
  Bell,
  BellOff,
  AlertTriangle,
  History,
  Network
} from 'lucide-react';

type TabType = 'orders' | 'delivering' | 'history' | 'stats' | 'hub' | 'settings';

export default function DeliveryDashboard() {
  const { role } = useRole();
  const { user } = useAuth();
  const { orders, updateOrderStatus, acceptDelivery, rejectDelivery, returnOrder, reportIssue, loading, realtimeConnected } = useSupabaseOrders({ orderTypeFilter: 'delivery' });
  const { reasons } = useCancellationReasons();
  const { reasons: issueReasons } = useIssueReasons();
  const { permission, isSupported, requestPermission, showNotification } = useNotificationPermission();
  const { areas } = useDeliveryAreas();
  const [activeTab, setActiveTab] = useState<TabType>('orders');
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [orderToReturn, setOrderToReturn] = useState<string | null>(null);
  const [selectedReturnReason, setSelectedReturnReason] = useState<string>('');
  
  // Issue reporting state
  const [issueDialogOpen, setIssueDialogOpen] = useState(false);
  const [orderToReport, setOrderToReport] = useState<string | null>(null);
  const [selectedIssueReason, setSelectedIssueReason] = useState<string>('');
  
  // Track previous pending orders count to detect new assignments
  const prevPendingCountRef = useRef<number>(0);

  // Orders assigned to this delivery person (pending acceptance)
  // Filter by delivery_person_id to show only orders assigned to current user
  const currentUserId = user?.id;

  // Build a map of area_id => display_order for sorting orders by proximity
  const areaOrderMap = new Map<string, number>();
  areas.forEach((a) => areaOrderMap.set(a.id, a.display_order));

  const sortByAreaProximity = (a: typeof orders[0], b: typeof orders[0]) => {
    const aOrder = a.delivery_area_id ? areaOrderMap.get(a.delivery_area_id) ?? 999 : 999;
    const bOrder = b.delivery_area_id ? areaOrderMap.get(b.delivery_area_id) ?? 999 : 999;
    return aOrder - bOrder;
  };

  const pendingAcceptanceOrders = orders
    .filter(o =>
      o.status === 'ready' &&
      o.pending_delivery_acceptance &&
      o.delivery_person_id === currentUserId
    )
    .sort(sortByAreaProximity);
  const deliveringOrders = orders
    .filter(o =>
      o.status === 'delivering' &&
      o.delivery_person_id === currentUserId
    )
    .sort(sortByAreaProximity);
  const deliveredOrders = orders.filter(o => 
    o.status === 'delivered' && 
    o.delivery_person_id === currentUserId
  );
  const cancelledByDelivery = orders.filter(o => 
    o.status === 'cancelled' && 
    o.delivery_person_id === currentUserId
  );
  

  // Show notification when new order is assigned
  useEffect(() => {
    if (!loading && pendingAcceptanceOrders.length > prevPendingCountRef.current) {
      // New order assigned
      const newOrder = pendingAcceptanceOrders[0];
      if (newOrder && permission === 'granted') {
        showNotification('طلب جديد محول إليك! 🔔', {
          body: `طلب #${newOrder.order_number} - ${newOrder.customer_name}\n${newOrder.customer_address || ''}`,
          tag: `order-${newOrder.id}`,
        });
      }
    }
    prevPendingCountRef.current = pendingAcceptanceOrders.length;
  }, [pendingAcceptanceOrders.length, loading, permission, showNotification]);

  const handleAcceptOrder = async (orderId: string) => {
    await acceptDelivery(orderId);
  };

  const handleRejectOrder = async (orderId: string) => {
    await rejectDelivery(orderId);
  };

  const handleDelivered = async (orderId: string) => {
    await updateOrderStatus(orderId, 'delivered');
    // Toast is handled by the hook
  };

  const handleReturnOrder = (orderId: string) => {
    setOrderToReturn(orderId);
    setSelectedReturnReason('');
    setReturnDialogOpen(true);
  };

  const confirmReturnOrder = async () => {
    if (orderToReturn) {
      if (!selectedReturnReason) {
        toast.error('الرجاء اختيار سبب الإرجاع');
        return;
      }
      await returnOrder(orderToReturn, selectedReturnReason);
      setReturnDialogOpen(false);
      setOrderToReturn(null);
      setSelectedReturnReason('');
    }
  };

  // Issue reporting handlers
  const handleReportIssue = (orderId: string) => {
    setOrderToReport(orderId);
    setSelectedIssueReason('');
    setIssueDialogOpen(true);
  };

  const confirmReportIssue = async () => {
    if (orderToReport) {
      if (!selectedIssueReason) {
        toast.error('الرجاء اختيار سبب المشكلة');
        return;
      }
      const reporterName = user?.fullName || user?.username || 'موظف توصيل';
      await reportIssue(orderToReport, selectedIssueReason, reporterName);
      setIssueDialogOpen(false);
      setOrderToReport(null);
      setSelectedIssueReason('');
    }
  };

  // Format phone number for WhatsApp (add Iraq country code if missing)
  const formatPhoneForWhatsApp = (phone: string): string => {
    // Remove any non-digit characters except +
    let cleaned = phone.replace(/[^\d+]/g, '');
    
    // If already has + at start, just remove the +
    if (cleaned.startsWith('+')) {
      return cleaned.substring(1);
    }
    
    // If starts with 00, replace with nothing (international format)
    if (cleaned.startsWith('00')) {
      return cleaned.substring(2);
    }
    
    // If starts with 0 (local Iraqi format), replace with 964
    if (cleaned.startsWith('0')) {
      return '964' + cleaned.substring(1);
    }
    
    // If doesn't start with 964, add it
    if (!cleaned.startsWith('964')) {
      return '964' + cleaned;
    }
    
    return cleaned;
  };

  const totalDelivered = deliveredOrders.length;
  const totalEarnings = deliveredOrders.reduce((sum, order) => sum + (order.delivery_fee || 0), 0);

  const tabs: { id: TabType; label: string; icon: React.ReactNode; count?: number; isPrimary?: boolean }[] = [
    { id: 'orders', label: 'الطلبات المحولة', icon: <ClipboardList className="w-5 h-5" />, count: pendingAcceptanceOrders.length, isPrimary: true },
    { id: 'delivering', label: 'التوصيل', icon: <Truck className="w-5 h-5" />, count: deliveringOrders.length },
    { id: 'history', label: 'السجل', icon: <History className="w-5 h-5" />, count: deliveredOrders.length + cancelledByDelivery.length },
    { id: 'stats', label: 'الإحصائيات', icon: <BarChart3 className="w-5 h-5" /> },
    { id: 'hub', label: 'الشبكة', icon: <Network className="w-5 h-5" /> },
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
    <div className="flex flex-col h-dvh bg-background">
      <DashboardHeader 
        title="موظف توصيل" 
        subtitle={user?.fullName || user?.username || ''} 
        icon={Truck} 
        iconClassName="bg-info"
        realtimeConnected={realtimeConnected}
        showConnectionIndicator={true}
      />

      {/* Main Content */}
      <main className="container py-3 sm:py-4 flex-1 overflow-auto">
        {/* Driver status toggle - visible on all tabs */}
        <div className="flex items-center justify-end mb-3">
          <DriverStatusToggle />
        </div>

        {activeTab === 'orders' && (
          <div className="space-y-3 sm:space-y-4">
            <h2 className="text-lg sm:text-xl font-bold">الطلبات المحولة إليك ({toEnglishNumbers(pendingAcceptanceOrders.length)})</h2>
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
            <h2 className="text-xl font-bold">قيد التوصيل ({toEnglishNumbers(deliveringOrders.length)})</h2>
            <OldOrderAlert orders={deliveringOrders} />
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
                      <div className="flex flex-col gap-2 w-full">
                        <div className="flex flex-wrap gap-2 w-full">
                          <Button variant="outline" size="sm" asChild>
                            <a href={`tel:${order.customer_phone}`}>
                              <Phone className="w-3 h-3 ml-1" />
                              اتصال
                            </a>
                          </Button>
                          <Button variant="success" size="sm" asChild>
                            <a href={`https://wa.me/${formatPhoneForWhatsApp(order.customer_phone)}`} target="_blank" rel="noopener noreferrer">
                              <MessageCircle className="w-3 h-3 ml-1" />
                              واتساب
                            </a>
                          </Button>
                          <Button variant="default" size="sm" onClick={() => handleDelivered(order.id)}>
                            <CheckCircle className="w-3 h-3 ml-1" />
                            تم التوصيل
                          </Button>
                          <Button variant="warning" size="sm" onClick={() => handleReturnOrder(order.id)}>
                            <Undo2 className="w-3 h-3 ml-1" />
                            راجع
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleReportIssue(order.id)}
                            className="border-destructive/50 text-destructive hover:bg-destructive/10"
                          >
                            <AlertTriangle className="w-3 h-3 ml-1" />
                            تبليغ
                          </Button>
                        </div>
                        <DeliveryOrderExtras order={order} />
                      </div>
                    }
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-4">
            <h2 className="text-lg sm:text-xl font-bold">سجل الطلبات ({toEnglishNumbers(deliveredOrders.length + cancelledByDelivery.length)})</h2>
            
            {deliveredOrders.length === 0 && cancelledByDelivery.length === 0 ? (
              <div className="text-center py-8 sm:py-12 text-muted-foreground">
                <History className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-4 opacity-50" />
                <p>لا توجد طلبات سابقة</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                {[...deliveredOrders, ...cancelledByDelivery]
                  .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
                  .map(order => (
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

        {activeTab === 'stats' && (
          <DriverStatsTab deliveredOrders={deliveredOrders} cancelledOrders={cancelledByDelivery} />
        )}

        {activeTab === 'hub' && (
          <DriverHubTab />
        )}


        {activeTab === 'settings' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">الإعدادات</h2>
            <div className="grid gap-4">
              {/* Notification Settings */}
              <div className="bg-card border border-border rounded-xl p-4 shadow-soft">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {permission === 'granted' ? (
                      <Bell className="w-5 h-5 text-success" />
                    ) : (
                      <BellOff className="w-5 h-5 text-muted-foreground" />
                    )}
                    <div>
                      <p className="font-medium">إشعارات الطلبات</p>
                      <p className="text-sm text-muted-foreground">
                        {!isSupported 
                          ? 'المتصفح لا يدعم الإشعارات'
                          : permission === 'granted' 
                            ? 'الإشعارات مفعلة' 
                            : permission === 'denied'
                              ? 'الإشعارات محظورة - فعلها من إعدادات المتصفح'
                              : 'فعل الإشعارات لاستلام تنبيهات الطلبات'}
                      </p>
                    </div>
                  </div>
                  {isSupported && permission === 'default' && (
                    <Button 
                      variant="default" 
                      size="sm" 
                      onClick={async () => {
                        const granted = await requestPermission();
                        if (granted) {
                          toast.success('تم تفعيل الإشعارات بنجاح');
                        }
                      }}
                    >
                      <Bell className="w-4 h-4 ml-1" />
                      تفعيل
                    </Button>
                  )}
                  {permission === 'granted' && (
                    <span className="text-success text-sm font-medium">مفعل ✓</span>
                  )}
                </div>
              </div>

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

      {/* Return Confirmation Dialog */}
      <AlertDialog open={returnDialogOpen} onOpenChange={(open) => {
        setReturnDialogOpen(open);
        if (!open) {
          setSelectedReturnReason('');
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد إرجاع الطلب</AlertDialogTitle>
            <AlertDialogDescription>
              الرجاء اختيار سبب إرجاع الطلب
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="py-4">
            <Label htmlFor="return-reason" className="mb-2 block">سبب الإرجاع</Label>
            <Select value={selectedReturnReason} onValueChange={setSelectedReturnReason}>
              <SelectTrigger id="return-reason" className="w-full">
                <SelectValue placeholder="اختر سبب الإرجاع" />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                {reasons.map((reason) => (
                  <SelectItem key={reason.id} value={reason.text}>
                    {reason.text}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmReturnOrder} 
              className="bg-warning hover:bg-warning/90 text-warning-foreground"
              disabled={!selectedReturnReason}
            >
              تأكيد الإرجاع
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Issue Report Dialog */}
      <AlertDialog open={issueDialogOpen} onOpenChange={(open) => {
        setIssueDialogOpen(open);
        if (!open) {
          setSelectedIssueReason('');
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              التبليغ عن مشكلة
            </AlertDialogTitle>
            <AlertDialogDescription>
              الرجاء اختيار نوع المشكلة في الطلب
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="py-4">
            <Label htmlFor="issue-reason" className="mb-2 block">نوع المشكلة</Label>
            <Select value={selectedIssueReason} onValueChange={setSelectedIssueReason}>
              <SelectTrigger id="issue-reason" className="w-full">
                <SelectValue placeholder="اختر نوع المشكلة" />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                {issueReasons.map((reason) => (
                  <SelectItem key={reason.id} value={reason.label}>
                    {reason.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmReportIssue} 
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              disabled={!selectedIssueReason}
            >
              تأكيد التبليغ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
