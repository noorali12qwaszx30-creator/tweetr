import { useState } from 'react';
import { useRole } from '@/contexts/RoleContext';
import { useSupabaseOrders, DbMenuItem, OrderWithItems } from '@/hooks/useSupabaseOrders';
import { useMenuItems, MenuItem } from '@/hooks/useMenuItems';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { OrderCard } from '@/components/OrderCard';
import { CancelOrderDialog } from '@/components/CancelOrderDialog';
import { SortableMenu } from '@/components/SortableMenu';
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
  Loader2
} from 'lucide-react';

type TabType = 'menu' | 'orders' | 'settings';

interface CartItem {
  menuItem: DbMenuItem;
  quantity: number;
  notes?: string;
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
  const handleReorderItems = async (items: MenuItem[]) => {
    await updateDisplayOrder(items);
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
      {/* Header */}
      <header className="bg-card border-b border-border shadow-soft sticky top-0 z-50">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-bold text-foreground">الكاشيرة</h1>
              <p className="text-xs text-muted-foreground">{role ? ROLE_LABELS[role] : ''}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={clearRole}>
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-4 pb-24">
        {activeTab === 'menu' && (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Menu Section */}
            <div className="lg:col-span-2">
              <SortableMenu
                items={menuItems}
                categories={categories}
                onSelectItem={addToCart}
                onReorder={handleReorderItems}
                accentColor="primary"
              />
            </div>

            {/* Cart Section */}
            <div className="space-y-4">
              <div className="bg-card border border-border rounded-xl p-4 shadow-soft">
                <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-primary" />
                  السلة
                </h2>

                {cart.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">السلة فارغة</p>
                ) : (
                  <div className="space-y-3">
                    {cart.map(item => (
                      <div key={item.menuItem.id} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => updateQuantity(item.menuItem.id, -1)}
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="w-6 text-center font-semibold">{item.quantity}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => updateQuantity(item.menuItem.id, 1)}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                        <span className="flex-1 text-sm truncate">{item.menuItem.name}</span>
                        <span className="text-sm text-muted-foreground">
                          {(item.menuItem.price * item.quantity).toLocaleString()}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => removeFromCart(item.menuItem.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                    
                    <div className="pt-3 border-t border-border">
                      <div className="flex justify-between font-bold text-lg">
                        <span>المجموع</span>
                        <span className="text-primary">{totalPrice.toLocaleString()} د.ع</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Customer Info */}
              <div className="bg-card border border-border rounded-xl p-4 shadow-soft space-y-3">
                <h2 className="font-bold text-lg mb-2">بيانات الزبون</h2>
                <div className="relative">
                  <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="الاسم"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="pr-10"
                  />
                </div>
                <div className="relative">
                  <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="رقم الهاتف"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="pr-10"
                  />
                </div>
                <div className="relative">
                  <MapPin className="absolute right-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="العنوان"
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    className="pr-10"
                  />
                </div>
                <div className="relative">
                  <MessageSquare className="absolute right-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Textarea
                    placeholder="ملاحظات (اختياري)"
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    className="pr-10 min-h-[80px]"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={clearCart}
                  disabled={cart.length === 0}
                >
                  <Trash2 className="w-4 h-4 ml-2" />
                  حذف الكل
                </Button>
                <Button
                  className="flex-1"
                  onClick={submitOrder}
                  disabled={cart.length === 0 || submitting}
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 ml-2" />
                  )}
                  إرسال الطلب
                </Button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">الطلبات الحالية ({activeOrders.length})</h2>
            {activeOrders.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <ClipboardList className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>لا توجد طلبات حالية</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeOrders.map(order => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    actions={
                      <>
                        {order.status !== 'ready' && order.status !== 'delivering' && (
                          <Button 
                            variant="success" 
                            size="sm"
                            onClick={() => handleMarkReady(order.id)}
                          >
                            <CheckCircle className="w-3 h-3 ml-1" />
                            نقل للجاهز
                          </Button>
                        )}
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={() => setCancellingOrder(order)}
                        >
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
            className={`flex-1 py-4 flex flex-col items-center gap-1 transition-colors ${
              activeTab === 'menu' ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <MenuIcon className="w-5 h-5" />
            <span className="text-xs font-medium">المنيو</span>
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`flex-1 py-4 flex flex-col items-center gap-1 transition-colors relative ${
              activeTab === 'orders' ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <ClipboardList className="w-5 h-5" />
            <span className="text-xs font-medium">الطلبات</span>
            {activeOrders.length > 0 && (
              <span className="absolute top-2 right-1/2 translate-x-4 w-5 h-5 bg-destructive text-destructive-foreground rounded-full text-xs flex items-center justify-center">
                {activeOrders.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex-1 py-4 flex flex-col items-center gap-1 transition-colors ${
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
