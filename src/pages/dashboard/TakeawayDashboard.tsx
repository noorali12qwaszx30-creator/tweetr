import { useState } from 'react';
import { useRole } from '@/contexts/RoleContext';
import { useSupabaseOrders, DbMenuItem } from '@/hooks/useSupabaseOrders';
import { useMenuItems } from '@/hooks/useMenuItems';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { OrderCard } from '@/components/OrderCard';
import { toast } from 'sonner';
import { ROLE_LABELS } from '@/types';
import {
  UtensilsCrossed,
  LogOut,
  ShoppingCart,
  Trash2,
  Send,
  Plus,
  Minus,
  ClipboardList,
  BarChart3,
  Menu as MenuIcon,
  Loader2
} from 'lucide-react';

type TabType = 'menu' | 'tracking' | 'stats';

interface CartItem {
  menuItem: DbMenuItem;
  quantity: number;
  notes?: string;
}

export default function TakeawayDashboard() {
  const { role, clearRole } = useRole();
  const { orders, addOrder, updateOrderStatus, loading } = useSupabaseOrders();
  const { menuItems, categories, loading: menuLoading } = useMenuItems();
  const [activeTab, setActiveTab] = useState<TabType>('menu');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderNotes, setOrderNotes] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const filteredItems = selectedCategory 
    ? menuItems.filter(item => item.category === selectedCategory && item.is_available)
    : menuItems.filter(item => item.is_available);

  const takeawayOrders = orders.filter(o => o.type === 'takeaway');
  const activeOrders = takeawayOrders.filter(o => !['delivered', 'cancelled'].includes(o.status));
  const completedOrders = takeawayOrders.filter(o => o.status === 'delivered');
  const cancelledOrders = takeawayOrders.filter(o => o.status === 'cancelled');

  const addToCart = (item: DbMenuItem) => {
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

  const clearCart = () => {
    setCart([]);
    setOrderNotes('');
  };

  const totalPrice = cart.reduce((sum, item) => sum + item.menuItem.price * item.quantity, 0);

  const submitOrder = async () => {
    if (cart.length === 0) {
      toast.error('السلة فارغة');
      return;
    }

    setSubmitting(true);
    const result = await addOrder({
      customer_name: 'زبون سفري',
      customer_phone: '',
      customer_address: 'عنوان المطعم',
      type: 'takeaway',
      notes: orderNotes || undefined,
      cashier_name: role ? ROLE_LABELS[role] : 'سفري',
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

  const handleDelivered = async (orderId: string) => {
    await updateOrderStatus(orderId, 'delivered');
    toast.success('تم التسليم');
  };

  const handleCancel = async (orderId: string) => {
    await updateOrderStatus(orderId, 'cancelled');
    toast.info('تم إلغاء الطلب');
  };

  const totalSales = completedOrders.reduce((sum, o) => sum + Number(o.total_price), 0);

  const tabs: { id: TabType; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: 'menu', label: 'المنيو', icon: <MenuIcon className="w-5 h-5" /> },
    { id: 'tracking', label: 'التتبع', icon: <ClipboardList className="w-5 h-5" />, count: activeOrders.length },
    { id: 'stats', label: 'الإحصائيات', icon: <BarChart3 className="w-5 h-5" /> },
  ];

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
            <div className="w-10 h-10 rounded-xl bg-warning flex items-center justify-center">
              <UtensilsCrossed className="w-5 h-5 text-warning-foreground" />
            </div>
            <div>
              <h1 className="font-bold text-foreground">السفري</h1>
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
            <div className="lg:col-span-2 space-y-4">
              {/* Categories */}
              <div className="flex gap-2 overflow-x-auto pb-2">
                <Button
                  variant={selectedCategory === null ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(null)}
                >
                  الكل
                </Button>
                {categories.map(cat => (
                  <Button
                    key={cat}
                    variant={selectedCategory === cat ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCategory(cat)}
                  >
                    {cat}
                  </Button>
                ))}
              </div>

              {/* Menu Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {filteredItems.map(item => (
                  <button
                    key={item.id}
                    onClick={() => addToCart(item)}
                    className="bg-card border border-border rounded-xl p-3 hover:border-warning hover:shadow-elevated transition-all duration-200 text-right"
                  >
                    <div className="aspect-square bg-muted rounded-lg mb-2 flex items-center justify-center">
                      <MenuIcon className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="font-semibold text-sm text-foreground truncate">{item.name}</h3>
                    <p className="text-warning font-bold text-sm">{item.price.toLocaleString()} د.ع</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Cart Section */}
            <div className="space-y-4">
              <div className="bg-warning/10 border-2 border-warning/30 rounded-xl p-4 shadow-soft">
                <h2 className="font-bold text-lg mb-4 flex items-center gap-2 text-warning">
                  <ShoppingCart className="w-5 h-5" />
                  طلب سفري
                </h2>

                {cart.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">السلة فارغة</p>
                ) : (
                  <div className="space-y-3">
                    {cart.map(item => (
                      <div key={item.menuItem.id} className="flex items-center gap-2 p-2 bg-background/50 rounded-lg">
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
                          onClick={() => setCart(prev => prev.filter(i => i.menuItem.id !== item.menuItem.id))}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                    
                    <div className="pt-3 border-t border-border">
                      <div className="flex justify-between font-bold text-lg">
                        <span>المجموع</span>
                        <span className="text-warning">{totalPrice.toLocaleString()} د.ع</span>
                      </div>
                    </div>
                  </div>
                )}

                <Textarea
                  placeholder="ملاحظات (اختياري)"
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  className="mt-4 min-h-[60px]"
                />

                <div className="flex gap-2 mt-4">
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={clearCart}
                    disabled={cart.length === 0}
                  >
                    <Trash2 className="w-4 h-4 ml-2" />
                    حذف
                  </Button>
                  <Button
                    variant="warning"
                    className="flex-1"
                    onClick={submitOrder}
                    disabled={cart.length === 0 || submitting}
                  >
                    {submitting ? (
                      <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4 ml-2" />
                    )}
                    إرسال
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'tracking' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">الطلبات المرفوعة ({activeOrders.length})</h2>
            {activeOrders.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <ClipboardList className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>لا توجد طلبات</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
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
                        <Button variant="destructive" size="sm" onClick={() => handleCancel(order.id)}>
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

        {activeTab === 'stats' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">الإحصائيات</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-card border border-border rounded-xl p-4 shadow-soft">
                <p className="text-muted-foreground text-sm">الطلبات المكتملة</p>
                <p className="text-3xl font-bold text-success">{completedOrders.length}</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-4 shadow-soft">
                <p className="text-muted-foreground text-sm">الطلبات الملغية</p>
                <p className="text-3xl font-bold text-destructive">{cancelledOrders.length}</p>
              </div>
              <div className="col-span-2 bg-card border border-border rounded-xl p-4 shadow-soft">
                <p className="text-muted-foreground text-sm">إجمالي المبيعات</p>
                <p className="text-3xl font-bold text-primary">{totalSales.toLocaleString()} د.ع</p>
              </div>
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
