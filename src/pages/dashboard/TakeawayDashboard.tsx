import { useState, useMemo, useCallback } from 'react';
import { useRole } from '@/contexts/RoleContext';
import { useAuth } from '@/contexts/AuthContext';
import { useSupabaseOrders, DbMenuItem, OrderWithItems } from '@/hooks/useSupabaseOrders';
import { useMenuItems, MenuItem } from '@/hooks/useMenuItems';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { OrderCard } from '@/components/OrderCard';
import { CancelOrderDialog } from '@/components/CancelOrderDialog';
import { LogoutConfirmButton } from '@/components/LogoutConfirmButton';
import { toast } from 'sonner';
import { ROLE_LABELS } from '@/types';
import { toEnglishNumbers, formatNumberWithCommas, formatTimeEnglish } from '@/lib/formatNumber';
import {
  UtensilsCrossed,
  ShoppingCart,
  Trash2,
  Send,
  Plus,
  Minus,
  ClipboardList,
  BarChart3,
  Menu as MenuIcon,
  Loader2,
  Settings,
  GripVertical,
  MessageSquare
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
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type TabType = 'menu' | 'tracking' | 'stats' | 'settings';

interface CartItem {
  menuItem: DbMenuItem;
  quantity: number;
  notes?: string;
}

interface SortableMenuItemProps {
  item: MenuItem;
  quantity: number;
  isAnimating: boolean;
  onSelect: (item: MenuItem) => void;
}

function SortableMenuItem({ item, quantity, isAnimating, onSelect }: SortableMenuItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 bg-card border rounded-xl p-3 hover:border-warning hover:shadow-soft transition-all duration-200 cursor-pointer ${quantity > 0 ? 'border-warning bg-warning/5' : 'border-border'} ${isAnimating ? 'animate-[pop_0.3s_ease-out]' : ''}`}
      onClick={() => onSelect(item)}
    >
      <div
        {...attributes}
        {...listeners}
        className="p-1 cursor-grab active:cursor-grabbing touch-none"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="w-4 h-4 text-muted-foreground" />
      </div>
      
      <div className="relative">
        {item.image ? (
          <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
            <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
            <MenuIcon className="w-5 h-5 text-muted-foreground" />
          </div>
        )}
        {quantity > 0 && (
          <div className={`absolute -top-2 -right-2 w-6 h-6 bg-warning text-warning-foreground rounded-full flex items-center justify-center text-xs font-bold shadow-md ${isAnimating ? 'animate-[bounce_0.3s_ease-out]' : ''}`}>
            {toEnglishNumbers(quantity)}
          </div>
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-sm text-foreground truncate">{item.name}</h3>
        <p className="text-warning font-bold text-sm">{formatNumberWithCommas(item.price)} د.ع</p>
      </div>
      
      <div className={`flex-shrink-0 h-10 w-10 rounded-full bg-warning/10 flex items-center justify-center text-warning ${isAnimating ? 'animate-[ping_0.3s_ease-out]' : ''}`}>
        <Plus className="w-5 h-5" />
      </div>
    </div>
  );
}

export default function TakeawayDashboard() {
  const { role } = useRole();
  const { user } = useAuth();
  const { orders, addOrder, updateOrderStatus, cancelOrder, loading } = useSupabaseOrders({ orderTypeFilter: 'takeaway' });
  const { menuItems, categories, loading: menuLoading, updateDisplayOrder } = useMenuItems();
  const [activeTab, setActiveTab] = useState<TabType>('menu');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderNotes, setOrderNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState<OrderWithItems | null>(null);
  const [showCompletedOrders, setShowCompletedOrders] = useState(false);
  const [showCancelledOrders, setShowCancelledOrders] = useState(false);
  const [animatingItemId, setAnimatingItemId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const takeawayOrders = orders.filter(o => o.type === 'takeaway');
  const activeOrders = takeawayOrders.filter(o => !['delivered', 'cancelled'].includes(o.status));
  const completedOrders = takeawayOrders.filter(o => o.status === 'delivered');
  const cancelledOrders = takeawayOrders.filter(o => o.status === 'cancelled');

  const filteredItems = useMemo(() => {
    const available = menuItems.filter(item => item.is_available);
    if (!selectedCategory) return available;
    return available.filter(item => item.category === selectedCategory);
  }, [menuItems, selectedCategory]);

  const sortedItems = [...filteredItems].sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

  const addToCart = useCallback((item: MenuItem) => {
    // Trigger animation
    setAnimatingItemId(item.id);
    setTimeout(() => setAnimatingItemId(null), 300);
    
    setCart(prev => {
      const existing = prev.find(i => i.menuItem.id === item.id);
      if (existing) {
        return prev.map(i => 
          i.menuItem.id === item.id 
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
      }
      return [...prev, { menuItem: item, quantity: 1 }];
    });
  }, []);

  const updateQuantity = (itemId: string, delta: number) => {
    setCart(prev => {
      return prev.map(i => {
        if (i.menuItem.id === itemId) {
          const newQty = i.quantity + delta;
          return newQty > 0 ? { ...i, quantity: newQty } : i;
        }
        return i;
      }).filter(i => i.quantity > 0);
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => prev.filter(i => i.menuItem.id !== itemId));
  };

  const clearCart = () => {
    setCart([]);
    setOrderNotes('');
  };

  const totalPrice = cart.reduce((sum, item) => sum + item.menuItem.price * item.quantity, 0);

  const submitOrder = () => {
    if (cart.length === 0) {
      toast.error('السلة فارغة');
      return;
    }

    // Clear cart immediately for instant feedback
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

    // Clear cart immediately
    clearCart();
    toast.success('جاري رفع الطلب...');

    // Send order in background
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
      const updatedItems = newItems.map((item, index) => ({
        ...item,
        display_order: index,
      }));

      await updateDisplayOrder(updatedItems);
    }
  };

  const totalSales = completedOrders.reduce((sum, o) => sum + Number(o.total_price), 0);

  const tabs: { id: TabType; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: 'menu', label: 'المنيو', icon: <MenuIcon className="w-5 h-5" /> },
    { id: 'tracking', label: 'التتبع', icon: <ClipboardList className="w-5 h-5" />, count: activeOrders.length },
    { id: 'stats', label: 'الإحصائيات', icon: <BarChart3 className="w-5 h-5" /> },
    { id: 'settings', label: 'الإعدادات', icon: <Settings className="w-5 h-5" /> },
  ];

  if (loading || menuLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-warning" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border shadow-soft sticky top-0 z-50">
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-warning flex items-center justify-center">
              <UtensilsCrossed className="w-4 h-4 text-warning-foreground" />
            </div>
            <div>
              <h1 className="font-bold text-foreground text-sm">السفري</h1>
              <p className="text-xs text-muted-foreground">{user?.fullName || user?.username || ''}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-3 pb-24 space-y-4">
        {activeTab === 'menu' && (
          <>
            {/* Cart Summary */}
            {cart.length > 0 && (
              <div className="bg-warning/10 border border-warning/30 rounded-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="font-bold text-sm flex items-center gap-2 text-warning">
                    <ShoppingCart className="w-4 h-4" />
                    طلب سفري ({toEnglishNumbers(cart.length)})
                  </h2>
                  <span className="font-bold text-warning">{formatNumberWithCommas(totalPrice)} د.ع</span>
                </div>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {cart.map(item => (
                    <div key={item.menuItem.id} className="flex items-center gap-2 text-sm bg-background/50 rounded-lg p-2">
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateQuantity(item.menuItem.id, -1)}>
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="w-5 text-center font-semibold text-xs">{toEnglishNumbers(item.quantity)}</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateQuantity(item.menuItem.id, 1)}>
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                      <span className="flex-1 truncate text-xs">{item.menuItem.name}</span>
                      <span className="text-xs text-muted-foreground">{formatNumberWithCommas(item.menuItem.price * item.quantity)}</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeFromCart(item.menuItem.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
                <div className="relative mt-2">
                  <MessageSquare className="absolute right-2 top-2 w-3 h-3 text-muted-foreground" />
                  <Textarea
                    placeholder="ملاحظات (اختياري)"
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    className="pr-7 min-h-[50px] text-sm"
                  />
                </div>
                <div className="flex gap-2 mt-2">
                  <Button variant="destructive" size="sm" className="flex-1" onClick={clearCart}>
                    <Trash2 className="w-3 h-3 ml-1" />
                    مسح
                  </Button>
                  <Button variant="warning" size="sm" className="flex-1" onClick={submitOrder} disabled={submitting}>
                    {submitting ? <Loader2 className="w-3 h-3 ml-1 animate-spin" /> : <Send className="w-3 h-3 ml-1" />}
                    إرسال
                  </Button>
                </div>
              </div>
            )}


            {/* Categories Strip */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              <Button
                variant={selectedCategory === null ? 'warning' : 'outline'}
                size="sm"
                className="flex-shrink-0 h-8 text-xs"
                onClick={() => setSelectedCategory(null)}
              >
                الكل
              </Button>
              {categories.map(cat => (
                <Button
                  key={cat}
                  variant={selectedCategory === cat ? 'warning' : 'outline'}
                  size="sm"
                  className="flex-shrink-0 h-8 text-xs"
                  onClick={() => setSelectedCategory(cat)}
                >
                  {cat}
                </Button>
              ))}
            </div>

            {/* Menu Items - Strip Layout */}
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={sortedItems.map(i => i.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {sortedItems.map(item => {
                    const cartItem = cart.find(c => c.menuItem.id === item.id);
                    return (
                      <SortableMenuItem 
                        key={item.id} 
                        item={item} 
                        quantity={cartItem?.quantity || 0}
                        isAnimating={animatingItemId === item.id}
                        onSelect={addToCart} 
                      />
                    );
                  })}
                </div>
              </SortableContext>
            </DndContext>

            {sortedItems.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <MenuIcon className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">لا توجد أصناف</p>
              </div>
            )}
          </>
        )}

        {activeTab === 'tracking' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold">الطلبات المرفوعة ({activeOrders.length})</h2>
            {activeOrders.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <ClipboardList className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>لا توجد طلبات</p>
              </div>
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

            {/* Cancel Order Dialog */}
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

            {/* Completed Orders List */}
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

            {/* Cancelled Orders List */}
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

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border shadow-elevated">
        <div className="container flex">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-3 flex flex-col items-center gap-1 transition-colors relative ${
                activeTab === tab.id ? 'text-warning' : 'text-muted-foreground'
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
