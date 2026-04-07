import { useState } from 'react';
import { AIAssistantChat } from '@/components/admin/AIAssistantChat';
import { useRole } from '@/contexts/RoleContext';
import { useAuth } from '@/contexts/AuthContext';
import { useSupabaseOrders, OrderWithItems } from '@/hooks/useSupabaseOrders';
import { useActivityLog } from '@/contexts/ActivityLogContext';
import { Button } from '@/components/ui/button';
import { MenuManagement } from '@/components/admin/MenuManagement';
import { AdminHomeTab } from '@/components/admin/AdminHomeTab';
import { AdminOrdersTab } from '@/components/admin/AdminOrdersTab';
import { AdminStatsTab } from '@/components/admin/AdminStatsTab';
import { AdminMonitoringTab } from '@/components/admin/AdminMonitoringTab';
import { AdminSettingsTab } from '@/components/admin/AdminSettingsTab';
import { toast } from 'sonner';
import { ShieldCheck, Loader2, Home, UtensilsCrossed, Package, BarChart3, Eye, Settings, Bot } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

type MainTab = 'home' | 'menu' | 'orders' | 'stats' | 'monitoring' | 'settings';

export default function AdminDashboard() {
  const { role } = useRole();
  const { user } = useAuth();
  const { orders, loading, refetch } = useSupabaseOrders({ orderTypeFilter: 'all' });
  const { activityLogs } = useActivityLog();
  const [activeTab, setActiveTab] = useState<MainTab>('home');
  const [selectedOrder, setSelectedOrder] = useState<OrderWithItems | null>(null);
  const [isDeletingOrders, setIsDeletingOrders] = useState(false);
  const [aiChatOpen, setAiChatOpen] = useState(false);

  const handleDeleteAllOrders = async () => {
    setIsDeletingOrders(true);
    try {
      const dummyId = '00000000-0000-0000-0000-000000000000';
      const { error: itemsError } = await supabase.from('order_items').delete().neq('id', dummyId);
      if (itemsError) throw itemsError;
      const { error: ordersError } = await supabase.from('orders').delete().neq('id', dummyId);
      if (ordersError) throw ordersError;
      const { error: customersError } = await supabase.from('customers').delete().neq('id', dummyId);
      if (customersError) console.error('Error deleting customers:', customersError);
      const { error: statsError } = await supabase.from('menu_item_statistics').delete().neq('id', dummyId);
      if (statsError) console.error('Error deleting menu_item_statistics:', statsError);
      const { error: areaStatsError } = await supabase.from('menu_item_area_stats').delete().neq('id', dummyId);
      if (areaStatsError) console.error('Error deleting menu_item_area_stats:', areaStatsError);
      const { error: dailyError } = await supabase.from('daily_statistics').delete().neq('id', dummyId);
      if (dailyError) console.error('Error deleting daily_statistics:', dailyError);
      const { error: insightsError } = await supabase.from('ai_insights').delete().neq('id', dummyId);
      if (insightsError) console.error('Error deleting ai_insights:', insightsError);
      const { error: snapshotsError } = await supabase.from('ai_analysis_snapshots').delete().neq('id', dummyId);
      if (snapshotsError) console.error('Error deleting ai_analysis_snapshots:', snapshotsError);
      const { error: areaResetError } = await supabase.from('delivery_areas').update({ order_count: 0 }).neq('id', dummyId);
      if (areaResetError) console.error('Error resetting delivery area counts:', areaResetError);
      const { error: resetError } = await supabase.rpc('reset_order_sequence');
      if (resetError) console.error('Error resetting order counter:', resetError);
      toast.success('تم حذف جميع البيانات وإعادة تعيين النظام بنجاح');
      refetch();
    } catch (error: any) {
      console.error('Error deleting all data:', error);
      toast.error('حدث خطأ أثناء حذف البيانات');
    } finally {
      setIsDeletingOrders(false);
    }
  };

  const mainTabs: { id: MainTab; label: string; icon: React.ReactNode }[] = [
    { id: 'home', label: 'الرئيسية', icon: <Home className="w-5 h-5" /> },
    { id: 'menu', label: 'المنيو', icon: <UtensilsCrossed className="w-5 h-5" /> },
    { id: 'orders', label: 'الطلبات', icon: <Package className="w-5 h-5" /> },
    { id: 'stats', label: 'الإحصائيات', icon: <BarChart3 className="w-5 h-5" /> },
    { id: 'monitoring', label: 'الرقابة', icon: <Eye className="w-5 h-5" /> },
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

      <main className="container py-4 flex-1 overflow-auto">
        {activeTab === 'home' && <AdminHomeTab orders={orders} activityLogs={activityLogs} />}
        
        {activeTab === 'menu' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <UtensilsCrossed className="w-6 h-6 text-primary" />
              إدارة المنيو السريع
            </h2>
            <MenuManagement />
          </div>
        )}
        
        {activeTab === 'orders' && <AdminOrdersTab orders={orders} onOrderClick={setSelectedOrder} />}
        {activeTab === 'stats' && <AdminStatsTab orders={orders} />}
        {activeTab === 'monitoring' && <AdminMonitoringTab orders={orders} />}
        {activeTab === 'settings' && <AdminSettingsTab ordersCount={orders.length} onDeleteAllOrders={handleDeleteAllOrders} isDeletingOrders={isDeletingOrders} />}
      </main>

      <nav className="bg-card border-t border-border shadow-elevated safe-area-pb shrink-0">
        <div className="container">
          <div className="flex justify-around items-center">
            {mainTabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex-1 py-3 flex flex-col items-center gap-1 transition-all ${activeTab === tab.id ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
                <div className={`p-1.5 rounded-lg transition-colors ${activeTab === tab.id ? 'bg-primary/10' : ''}`}>
                  {tab.icon}
                </div>
                <span className="text-xs font-medium">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedOrder(null)}>
          <div className="bg-card rounded-xl p-6 max-w-md w-full max-h-[80vh] overflow-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4">تفاصيل الطلب <span className="text-primary px-2 py-0.5 border-2 border-primary/30 rounded-lg bg-primary/5">{selectedOrder.order_number}</span></h2>
            <div className="space-y-3">
              <div><p className="text-sm text-muted-foreground">الزبون</p><p className="font-semibold">{selectedOrder.customer_name}</p></div>
              <div><p className="text-sm text-muted-foreground">العنوان</p><p className="font-semibold">{selectedOrder.customer_address || '-'}</p></div>
              <div><p className="text-sm text-muted-foreground">الهاتف</p><p className="font-semibold">{selectedOrder.customer_phone || '-'}</p></div>
              <div>
                <p className="text-sm text-muted-foreground">الأصناف</p>
                <div className="space-y-1 mt-1">
                  {selectedOrder.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span>{item.menu_item_name} × {item.quantity}</span>
                      <span>{(Number(item.menu_item_price) * item.quantity).toLocaleString()} د.ع</span>
                    </div>
                  ))}
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
        </div>
      )}

      <button
        onClick={() => setAiChatOpen(true)}
        className="fixed bottom-20 left-4 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all hover:scale-105 flex items-center justify-center animate-pulse"
        style={{ animationDuration: '3s' }}
      >
        <Bot className="w-6 h-6" />
      </button>

      <AIAssistantChat open={aiChatOpen} onOpenChange={setAiChatOpen} />
    </div>
  );
}
