import { useState, useMemo } from 'react';
import { useRole } from '@/contexts/RoleContext';
import { useAuth } from '@/contexts/AuthContext';
import { useSupabaseOrders, OrderWithItems } from '@/hooks/useSupabaseOrders';
import { useMenuItems } from '@/hooks/useMenuItems';
import { useCart } from '@/hooks/useCart';
import { OrderCard } from '@/components/OrderCard';
import { CancelOrderDialog } from '@/components/CancelOrderDialog';
import { LogoutConfirmButton } from '@/components/LogoutConfirmButton';
import { DashboardHeader } from '@/components/shared/DashboardHeader';
import { BottomNavigation } from '@/components/shared/BottomNavigation';
import { SortableMenuItem } from '@/components/shared/SortableMenuItem';
import { CartSummary } from '@/components/shared/CartSummary';
import { CategoryTabs } from '@/components/shared/CategoryTabs';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ROLE_LABELS } from '@/types';
import { toEnglishNumbers, formatNumberWithCommas, formatTimeEnglish } from '@/lib/formatNumber';
import {
  UtensilsCrossed,
  ClipboardList,
  BarChart3,
  Menu as MenuIcon,
  Loader2,
  Settings,
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

type TabType = 'menu' | 'tracking' | 'stats' | 'settings';

export default function TakeawayDashboard() {
  const { role } = useRole();
  const { user } = useAuth();
  const { orders, addOrder, updateOrderStatus, cancelOrder, loading, realtimeConnected } = useSupabaseOrders({ orderTypeFilter: 'takeaway' });
  const { menuItems, categories, loading: menuLoading, updateDisplayOrder } = useMenuItems();
  const { 
    cart, 
    animatingItemId, 
    addToCart, 
    updateQuantity, 
    removeFromCart, 
    clearCart, 
    totalPrice,
    getItemQuantity 
  } = useCart();
  
  const [activeTab, setActiveTab] = useState<TabType>('menu');
  const [orderNotes, setOrderNotes] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState<OrderWithItems | null>(null);
  const [showCompletedOrders, setShowCompletedOrders] = useState(false);
  const [showCancelledOrders, setShowCancelledOrders] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Filter orders
  const takeawayOrders = orders.filter(o => o.type === 'takeaway');
  const activeOrders = takeawayOrders.filter(o => !['delivered', 'cancelled'].includes(o.status));
  const completedOrders = takeawayOrders.filter(o => o.status === 'delivered');
  const cancelledOrders = takeawayOrders.filter(o => o.status === 'cancelled');

  // Filter and sort menu items
  const filteredItems = useMemo(() => {
    const available = menuItems.filter(item => item.is_available);
    if (!selectedCategory) return available;
    return available.filter(item => item.category === selectedCategory);
  }, [menuItems, selectedCategory]);

  const sortedItems = [...filteredItems].sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

  const submitOrder = () => {
    if (cart.length === 0) {
      toast.error('السلة فارغة');
      return;
    }

    const orderData = {
      customer_name: 'زبون سفري',
      customer_phone: '',
      customer_address: 'عنوان المطعم',
      type: 'takeaway' as const,
      notes: orderNotes || undefined,
      cashier_name: role ? ROLE_LABELS[role] : 'سفري',
      items: cart.map(item => ({
        menu_item_id: item.menuItem.id,
        menu_item_name: item.menuItem.name,
        menu_item_price: item.menuItem.price,
        quantity: item.quantity,
        notes: item.notes,
      })),
    };

    clearCart();
    setOrderNotes('');
    toast.success('جاري رفع الطلب...');
    addOrder(orderData);
  };

  const handleDelivered = async (orderId: string) => {
    await updateOrderStatus(orderId, 'delivered');
    toast.success('تم التسليم');
  };

  const handleCancelClick = (order: OrderWithItems) => {
    setOrderToCancel(order);
    setCancelDialogOpen(true);
  };

  const handleCancelConfirm = async (orderId: string, reason: string) => {
    await cancelOrder(orderId, reason);
    setCancelDialogOpen(false);
    setOrderToCancel(null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = sortedItems.findIndex((item) => item.id === active.id);
      const newIndex = sortedItems.findIndex((item) => item.id === over.id);
      const newItems = arrayMove(sortedItems, oldIndex, newIndex);
      const updatedItems = newItems.map((item, index) => ({ ...item, display_order: index }));
      await updateDisplayOrder(updatedItems);
    }
  };

  const totalSales = completedOrders.reduce((sum, o) => sum + Number(o.total_price), 0);

  const tabs = [
    { id: 'menu', label: 'المنيو', icon: <MenuIcon className="w-5 h-5" /> },
    { id: 'tracking', label: 'التتبع', icon: <ClipboardList className="w-5 h-5" />, count: activeOrders.length },
    { id: 'stats', label: 'الإحصائيات', icon: <BarChart3 className="w-5 h-5" /> },
    { id: 'settings', label: 'الإعدادات', icon: <Settings className="w-5 h-5" /> },
  ];

  // Show loading only on initial load
  if (menuLoading && menuItems.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-warning" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader 
        title="السفري" 
        subtitle={user?.fullName || user?.username || ''} 
        icon={UtensilsCrossed} 
        iconClassName="bg-warning"
        realtimeConnected={realtimeConnected}
        showConnectionIndicator={true}
      />

      <main className="container py-3 pb-36 space-y-4">
        {activeTab === 'menu' && (
          <>
            <CartSummary
              cart={cart}
              totalPrice={totalPrice}
              orderNotes={orderNotes}
              onOrderNotesChange={setOrderNotes}
              onUpdateQuantity={updateQuantity}
              onRemoveItem={removeFromCart}
              onClear={() => { clearCart(); setOrderNotes(''); }}
              onSubmit={submitOrder}
              title="طلب سفري"
              variant="warning"
            />

            <CategoryTabs
              categories={categories}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
              variant="warning"
            />

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={sortedItems.map(i => i.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {sortedItems.map(item => (
                    <SortableMenuItem 
                      key={item.id} 
                      item={item} 
                      quantity={getItemQuantity(item.id)}
                      isAnimating={animatingItemId === item.id}
                      onSelect={addToCart}
                      variant="warning"
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            {sortedItems.length === 0 && (
              <EmptyState icon={MenuIcon} message="لا توجد أصناف" />
            )}
          </>
        )}

        {activeTab === 'tracking' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold">الطلبات المرفوعة ({activeOrders.length})</h2>
            {activeOrders.length === 0 ? (
              <EmptyState icon={ClipboardList} message="لا توجد طلبات" />
            ) : (
              <div className="grid gap-3">
                {activeOrders.map(order => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    showCustomerInfo={false}
                    actions={
                      <>
                        <Button variant="success" size="sm" onClick={() => handleDelivered(order.id)}>
                          تم التسليم
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => handleCancelClick(order)}>
                          إلغاء
                        </Button>
                      </>
                    }
                  />
                ))}
              </div>
            )}

            {orderToCancel && (
              <CancelOrderDialog
                orderId={orderToCancel.id}
                orderNumber={orderToCancel.order_number}
                open={cancelDialogOpen}
                onOpenChange={setCancelDialogOpen}
                onCancel={handleCancelConfirm}
              />
            )}
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold">الإحصائيات</h2>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowCompletedOrders(!showCompletedOrders)}
                className="bg-card border border-border rounded-xl p-3 shadow-soft hover:border-success transition-colors text-right"
              >
                <p className="text-muted-foreground text-xs">الطلبات المكتملة</p>
                <p className="text-2xl font-bold text-success">{toEnglishNumbers(completedOrders.length)}</p>
              </button>
              <button
                onClick={() => setShowCancelledOrders(!showCancelledOrders)}
                className="bg-card border border-border rounded-xl p-3 shadow-soft hover:border-destructive transition-colors text-right"
              >
                <p className="text-muted-foreground text-xs">الطلبات الملغية</p>
                <p className="text-2xl font-bold text-destructive">{toEnglishNumbers(cancelledOrders.length)}</p>
              </button>
              <div className="col-span-2 bg-card border border-border rounded-xl p-3 shadow-soft">
                <p className="text-muted-foreground text-xs">إجمالي المبيعات</p>
                <p className="text-2xl font-bold text-warning">{formatNumberWithCommas(totalSales)} د.ع</p>
              </div>
            </div>

            {showCompletedOrders && completedOrders.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-success flex items-center gap-2">
                  <ClipboardList className="w-4 h-4" />
                  الطلبات المكتملة ({toEnglishNumbers(completedOrders.length)})
                </h3>
                <div className="grid gap-2">
                  {completedOrders.map(order => (
                    <div key={order.id} className="bg-success/10 border border-success/30 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-success">طلب #{toEnglishNumbers(order.order_number)}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatTimeEnglish(order.delivered_at || order.updated_at)}
                        </span>
                      </div>
                      <div className="space-y-1 text-sm">
                        {order.items.map(item => (
                          <div key={item.id} className="flex justify-between">
                            <span>{item.menu_item_name} × {toEnglishNumbers(item.quantity)}</span>
                            <span className="text-muted-foreground">{formatNumberWithCommas(item.menu_item_price * item.quantity)} د.ع</span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-2 pt-2 border-t border-success/20 flex justify-between font-bold">
                        <span>المجموع</span>
                        <span className="text-success">{formatNumberWithCommas(Number(order.total_price))} د.ع</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {showCancelledOrders && cancelledOrders.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-destructive flex items-center gap-2">
                  <ClipboardList className="w-4 h-4" />
                  الطلبات الملغية ({toEnglishNumbers(cancelledOrders.length)})
                </h3>
                <div className="grid gap-2">
                  {cancelledOrders.map(order => (
                    <div key={order.id} className="bg-destructive/10 border border-destructive/30 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-destructive">طلب #{toEnglishNumbers(order.order_number)}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatTimeEnglish(order.cancelled_at || order.updated_at)}
                        </span>
                      </div>
                      {order.cancellation_reason && (
                        <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-2 py-1 mb-2">
                          سبب الإلغاء: {order.cancellation_reason}
                        </p>
                      )}
                      <div className="space-y-1 text-sm">
                        {order.items.map(item => (
                          <div key={item.id} className="flex justify-between">
                            <span>{item.menu_item_name} × {toEnglishNumbers(item.quantity)}</span>
                            <span className="text-muted-foreground">{formatNumberWithCommas(item.menu_item_price * item.quantity)} د.ع</span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-2 pt-2 border-t border-destructive/20 flex justify-between font-bold">
                        <span>المجموع</span>
                        <span className="text-destructive line-through">{formatNumberWithCommas(Number(order.total_price))} د.ع</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold">الإعدادات</h2>
            <div className="grid gap-4">
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
    </div>
  );
}
