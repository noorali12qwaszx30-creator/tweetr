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
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ROLE_LABELS } from '@/types';
import { toEnglishNumbers, formatNumberWithCommas } from '@/lib/formatNumber';
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
  AlertTriangle
} from 'lucide-react';

type TabType = 'orders' | 'delivering' | 'stats' | 'settings';

export default function DeliveryDashboard() {
  const { role } = useRole();
  const { user } = useAuth();
  const { orders, updateOrderStatus, acceptDelivery, rejectDelivery, returnOrder, reportIssue, loading, realtimeConnected } = useSupabaseOrders({ orderTypeFilter: 'delivery' });
  const { reasons } = useCancellationReasons();
  const { reasons: issueReasons } = useIssueReasons();
  const { permission, isSupported, requestPermission, showNotification } = useNotificationPermission();
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
  const pendingAcceptanceOrders = orders.filter(o => 
    o.status === 'ready' && 
    o.pending_delivery_acceptance && 
    o.delivery_person_id === currentUserId
  );
  const deliveringOrders = orders.filter(o => 
    o.status === 'delivering' && 
    o.delivery_person_id === currentUserId
  );
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

  const tabs: { id: TabType; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: 'orders', label: 'الطلبات', icon: <ClipboardList className="w-5 h-5" />, count: pendingAcceptanceOrders.length },
    { id: 'delivering', label: 'التوصيل', icon: <Truck className="w-5 h-5" />, count: deliveringOrders.length },
    { id: 'stats', label: 'الإحصائيات', icon: <BarChart3 className="w-5 h-5" /> },
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
                <p className="text-2xl sm:text-3xl font-bold text-success">{toEnglishNumbers(totalDelivered)}</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-3 sm:p-4 shadow-soft">
                <p className="text-muted-foreground text-xs sm:text-sm">إجمالي الأرباح</p>
                <p className="text-2xl sm:text-3xl font-bold text-primary">{formatNumberWithCommas(totalEarnings)} د.ع</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-3 sm:p-4 shadow-soft">
                <p className="text-muted-foreground text-xs sm:text-sm">الطلبات الملغية</p>
                <p className="text-2xl sm:text-3xl font-bold text-destructive">{toEnglishNumbers(cancelledByDelivery.length)}</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-3 sm:p-4 shadow-soft">
                <p className="text-muted-foreground text-xs sm:text-sm">متوسط الفائدة</p>
                <p className="text-2xl sm:text-3xl font-bold text-foreground">
                  {totalDelivered > 0 ? formatNumberWithCommas(Math.round(totalEarnings / totalDelivered)) : '0'} د.ع
                </p>
              </div>
            </div>
          </div>
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

      {/* Bottom Navigation */}
      <nav className="bg-card border-t border-border shadow-elevated pb-safe shrink-0">
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
                  {toEnglishNumbers(tab.count)}
                </span>
              )}
            </button>
          ))}
        </div>
      </nav>

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
