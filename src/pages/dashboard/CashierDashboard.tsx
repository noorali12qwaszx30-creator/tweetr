import { useState, useMemo } from 'react';
import { useRole } from '@/contexts/RoleContext';
import { useSupabaseOrders, DbMenuItem, OrderWithItems } from '@/hooks/useSupabaseOrders';
import { useMenuItems, MenuItem } from '@/hooks/useMenuItems';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { OrderCard } from '@/components/OrderCard';
import { CancelOrderDialog } from '@/components/CancelOrderDialog';
import { QuickAccessReturnButton } from '@/components/admin/QuickAccessReturnButton';
import { toast } from 'sonner';
import { ROLE_LABELS } from '@/types';
import { 
  ShoppingCart, 
  Trash2, 
  Send, 
  Plus, 
  Minus, 
  ClipboardList,
  Menu as MenuIcon,
  LogOut,
  User,
  Phone,
  Settings,
  MapPin,
  MessageSquare,
  CheckCircle,
  XCircle,
  Loader2,
  Star,
  GripVertical
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

type TabType = 'menu' | 'orders' | 'settings';

interface CartItem {
  menuItem: DbMenuItem;
  quantity: number;
  notes?: string;
}

interface SortableMenuItemProps {
  item: MenuItem;
  onSelect: (item: MenuItem) => void;
}

function SortableMenuItem({ item, onSelect }: SortableMenuItemProps) {
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
      className="flex items-center gap-3 bg-card border border-border rounded-xl p-3 hover:border-primary hover:shadow-soft transition-all duration-200"
    >
      <div
        {...attributes}
        {...listeners}
        className="p-1 cursor-grab active:cursor-grabbing touch-none"
      >
        <GripVertical className="w-4 h-4 text-muted-foreground" />
      </div>
      
      {item.image ? (
        <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
          <MenuIcon className="w-5 h-5 text-muted-foreground" />
        </div>
      )}
      
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-sm text-foreground truncate">{item.name}</h3>
        <p className="text-primary font-bold text-sm">{item.price.toLocaleString()} د.ع</p>
      </div>
      
      <Button
        size="icon"
        variant="ghost"
        className="h-10 w-10 rounded-full bg-primary/10 hover:bg-primary/20 text-primary flex-shrink-0"
        onClick={() => onSelect(item)}
      >
        <Plus className="w-5 h-5" />
      </Button>
    </div>
  );
}

export default function CashierDashboard() {
  const { role, clearRole } = useRole();
  const { orders, addOrder, updateOrderStatus, cancelOrder, loading } = useSupabaseOrders();
  const { menuItems, categories, loading: menuLoading, updateDisplayOrder } = useMenuItems();
  const [activeTab, setActiveTab] = useState<TabType>('menu');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [cancellingOrder, setCancellingOrder] = useState<OrderWithItems | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

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

  // Calculate most used items based on order history
  const mostUsedItems = useMemo(() => {
    const itemCounts: Record<string, number> = {};
    
    orders.forEach(order => {
      order.items.forEach(item => {
        if (item.menu_item_id) {
          itemCounts[item.menu_item_id] = (itemCounts[item.menu_item_id] || 0) + item.quantity;
        }
      });
    });
    
    const sortedIds = Object.entries(itemCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([id]) => id);
    
    return menuItems.filter(item => sortedIds.includes(item.id) && item.is_available);
  }, [orders, menuItems]);

  const filteredItems = useMemo(() => {
    const available = menuItems.filter(item => item.is_available);
    if (!selectedCategory) return available;
    return available.filter(item => item.category === selectedCategory);
  }, [menuItems, selectedCategory]);

  const sortedItems = [...filteredItems].sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

  const addToCart = (item: MenuItem) => {
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
  };

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
    setCustomerName('');
    setCustomerPhone('');
    setCustomerAddress('');
    setOrderNotes('');
  };

  const totalPrice = cart.reduce((sum, item) => sum + item.menuItem.price * item.quantity, 0);

  const submitOrder = async () => {
    if (cart.length === 0) {
      toast.error('السلة فارغة');
      return;
    }

    if (!customerName || !customerPhone || !customerAddress) {
      toast.error('يرجى إدخال بيانات الزبون كاملة');
      return;
    }

    setSubmitting(true);
    const result = await addOrder({
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_address: customerAddress,
      type: 'delivery',
      notes: orderNotes || undefined,
      cashier_name: role ? ROLE_LABELS[role] : 'كاشير',
      items: cart.map(item => ({
        menu_item_id: item.menuItem.id,
        menu_item_name: item.menuItem.name,
        menu_item_price: item.menuItem.price,
        quantity: item.quantity,
        notes: item.notes,
      })),
    });

    setSubmitting(false);
    if (result) {
      clearCart();
    }
  };

  const handleMarkReady = async (orderId: string) => {
    await updateOrderStatus(orderId, 'ready');
  };

  const handleCancelOrder = async (orderId: string, reason?: string) => {
    await cancelOrder(orderId, reason);
    setCancellingOrder(null);
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

  const activeOrders = orders.filter(o => !['delivered', 'cancelled'].includes(o.status));

  if (loading || menuLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <QuickAccessReturnButton />
      {/* Header */}
      <header className="bg-card border-b border-border shadow-soft sticky top-0 z-50">
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center">
              <ShoppingCart className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-bold text-foreground text-sm">الكاشيرة</h1>
              <p className="text-xs text-muted-foreground">{role ? ROLE_LABELS[role] : ''}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={clearRole}>
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-3 pb-24 space-y-4">
        {activeTab === 'menu' && (
          <>
            {/* Customer Info - First */}
            <div className="bg-card border border-border rounded-xl p-3 shadow-soft">
              <h2 className="font-bold text-sm mb-3 flex items-center gap-2">
                <User className="w-4 h-4 text-primary" />
                بيانات الزبون
              </h2>
              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <User className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                  <Input
                    placeholder="الاسم"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="pr-7 h-9 text-sm"
                  />
                </div>
                <div className="relative">
                  <Phone className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                  <Input
                    placeholder="رقم الهاتف"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="pr-7 h-9 text-sm"
                  />
                </div>
                <div className="relative col-span-2">
                  <MapPin className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                  <Input
                    placeholder="العنوان"
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    className="pr-7 h-9 text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Cart Summary */}
            {cart.length > 0 && (
              <div className="bg-primary/10 border border-primary/20 rounded-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="font-bold text-sm flex items-center gap-2">
                    <ShoppingCart className="w-4 h-4 text-primary" />
                    السلة ({cart.length})
                  </h2>
                  <span className="font-bold text-primary">{totalPrice.toLocaleString()} د.ع</span>
                </div>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {cart.map(item => (
                    <div key={item.menuItem.id} className="flex items-center gap-2 text-sm bg-background/50 rounded-lg p-2">
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateQuantity(item.menuItem.id, -1)}>
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="w-5 text-center font-semibold text-xs">{item.quantity}</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateQuantity(item.menuItem.id, 1)}>
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                      <span className="flex-1 truncate text-xs">{item.menuItem.name}</span>
                      <span className="text-xs text-muted-foreground">{(item.menuItem.price * item.quantity).toLocaleString()}</span>
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
                  <Button size="sm" className="flex-1" onClick={submitOrder} disabled={submitting}>
                    {submitting ? <Loader2 className="w-3 h-3 ml-1 animate-spin" /> : <Send className="w-3 h-3 ml-1" />}
                    إرسال
                  </Button>
                </div>
              </div>
            )}

            {/* Most Used Section */}
            {mostUsedItems.length > 0 && (
              <div>
                <h2 className="font-bold text-sm mb-2 flex items-center gap-2">
                  <Star className="w-4 h-4 text-warning" />
                  الأكثر استخداماً
                </h2>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {mostUsedItems.map(item => (
                    <button
                      key={item.id}
                      onClick={() => addToCart(item)}
                      className="flex-shrink-0 bg-warning/10 border border-warning/30 rounded-xl p-2 hover:bg-warning/20 transition-all duration-200 text-center min-w-[80px]"
                    >
                      {item.image ? (
                        <div className="w-12 h-12 rounded-lg overflow-hidden mx-auto mb-1">
                          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-12 h-12 bg-muted rounded-lg mx-auto mb-1 flex items-center justify-center">
                          <MenuIcon className="w-5 h-5 text-muted-foreground" />
                        </div>
                      )}
                      <p className="text-xs font-medium truncate">{item.name}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Categories Strip */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              <Button
                variant={selectedCategory === null ? 'default' : 'outline'}
                size="sm"
                className="flex-shrink-0 h-8 text-xs"
                onClick={() => setSelectedCategory(null)}
              >
                الكل
              </Button>
              {categories.map(cat => (
                <Button
                  key={cat}
                  variant={selectedCategory === cat ? 'default' : 'outline'}
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
                  {sortedItems.map(item => (
                    <SortableMenuItem key={item.id} item={item} onSelect={addToCart} />
                  ))}
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

        {activeTab === 'orders' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold">الطلبات الحالية ({activeOrders.length})</h2>
            {activeOrders.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <ClipboardList className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>لا توجد طلبات حالية</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {activeOrders.map(order => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    actions={
                      <>
                        {order.status !== 'ready' && order.status !== 'delivering' && (
                          <Button variant="success" size="sm" onClick={() => handleMarkReady(order.id)}>
                            <CheckCircle className="w-3 h-3 ml-1" />
                            نقل للجاهز
                          </Button>
                        )}
                        <Button variant="destructive" size="sm" onClick={() => setCancellingOrder(order)}>
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

        {activeTab === 'settings' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">الإعدادات</h2>
            <div className="grid gap-4">
              <Button 
                variant="destructive" 
                size="lg" 
                className="w-full justify-start h-auto py-4"
                onClick={clearRole}
              >
                <LogOut className="w-5 h-5 ml-3" />
                <div className="text-right">
                  <p className="font-semibold">تسجيل الخروج</p>
                  <p className="text-sm text-destructive-foreground/70">العودة لاختيار الدور</p>
                </div>
              </Button>
            </div>
          </div>
        )}

        {/* Cancel Order Dialog */}
        {cancellingOrder && (
          <CancelOrderDialog
            order={{
              id: cancellingOrder.id,
              orderNumber: cancellingOrder.order_number,
              customer: {
                name: cancellingOrder.customer_name,
                phone: cancellingOrder.customer_phone,
                address: cancellingOrder.customer_address || '',
              },
              items: cancellingOrder.items.map(i => ({
                menuItem: { id: i.menu_item_id || '', name: i.menu_item_name, price: Number(i.menu_item_price), image: '', category: '' },
                quantity: i.quantity,
                notes: i.notes || undefined,
              })),
              status: cancellingOrder.status,
              type: cancellingOrder.type,
              notes: cancellingOrder.notes || undefined,
              totalPrice: Number(cancellingOrder.total_price),
              createdAt: new Date(cancellingOrder.created_at),
              cashierName: cancellingOrder.cashier_name || '',
            }}
            open={!!cancellingOrder}
            onOpenChange={(open) => !open && setCancellingOrder(null)}
            onCancel={handleCancelOrder}
          />
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border shadow-elevated">
        <div className="container flex">
          <button
            onClick={() => setActiveTab('menu')}
            className={`flex-1 py-3 flex flex-col items-center gap-1 transition-colors ${
              activeTab === 'menu' ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <MenuIcon className="w-5 h-5" />
            <span className="text-xs font-medium">المنيو</span>
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`flex-1 py-3 flex flex-col items-center gap-1 transition-colors relative ${
              activeTab === 'orders' ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <ClipboardList className="w-5 h-5" />
            <span className="text-xs font-medium">الطلبات</span>
            {activeOrders.length > 0 && (
              <span className="absolute top-1 right-1/2 translate-x-4 w-5 h-5 bg-destructive text-destructive-foreground rounded-full text-xs flex items-center justify-center">
                {activeOrders.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex-1 py-3 flex flex-col items-center gap-1 transition-colors ${
              activeTab === 'settings' ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <Settings className="w-5 h-5" />
            <span className="text-xs font-medium">الإعدادات</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
