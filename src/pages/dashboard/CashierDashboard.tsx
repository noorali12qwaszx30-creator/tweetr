import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useOrders, MENU_ITEMS } from '@/contexts/OrderContext';
import { OrderItem, MenuItem, Order } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { OrderCard } from '@/components/OrderCard';
import { EditOrderDialog } from '@/components/EditOrderDialog';
import { toast } from 'sonner';
import { 
  ShoppingCart, 
  Trash2, 
  Send, 
  Plus, 
  Minus, 
  ClipboardList,
  Menu as MenuIcon,
  LogOut,
  Edit,
  User,
  Phone,
  MapPin,
  MessageSquare,
  CheckCircle
} from 'lucide-react';

type TabType = 'menu' | 'orders';

export default function CashierDashboard() {
  const { user, logout } = useAuth();
  const { orders, addOrder, updateOrderStatus, updateOrder } = useOrders();
  const [activeTab, setActiveTab] = useState<TabType>('menu');
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);

  const categories = [...new Set(MENU_ITEMS.map(item => item.category))];
  const filteredItems = selectedCategory 
    ? MENU_ITEMS.filter(item => item.category === selectedCategory)
    : MENU_ITEMS;

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

  const submitOrder = () => {
    if (cart.length === 0) {
      toast.error('السلة فارغة');
      return;
    }

    if (!customerName || !customerPhone || !customerAddress) {
      toast.error('يرجى إدخال بيانات الزبون كاملة');
      return;
    }

    addOrder({
      customer: {
        name: customerName,
        phone: customerPhone,
        address: customerAddress,
      },
      items: cart,
      status: 'pending',
      type: 'delivery',
      notes: orderNotes || undefined,
      totalPrice,
      cashierName: user?.username || 'كاشير',
    });

    toast.success('تم إرسال الطلب بنجاح');
    clearCart();
  };

  const handleMarkReady = (orderId: string) => {
    updateOrderStatus(orderId, 'ready');
    toast.success('تم نقل الطلب إلى الجاهز');
  };

  const activeOrders = orders.filter(o => !['delivered', 'cancelled'].includes(o.status));

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
                    className="bg-card border border-border rounded-xl p-3 hover:border-primary hover:shadow-elevated transition-all duration-200 text-right"
                  >
                    <div className="aspect-square bg-muted rounded-lg mb-2 flex items-center justify-center">
                      <MenuIcon className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="font-semibold text-sm text-foreground truncate">{item.name}</h3>
                    <p className="text-primary font-bold text-sm">{item.price.toLocaleString()} د.ع</p>
                  </button>
                ))}
              </div>
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
                  disabled={cart.length === 0}
                >
                  <Send className="w-4 h-4 ml-2" />
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
                        <Button 
                          variant="outline" 
                          size="sm"
                          disabled={order.status === 'delivering'}
                          onClick={() => setEditingOrder(order)}
                        >
                          <Edit className="w-3 h-3 ml-1" />
                          تعديل
                        </Button>
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
                        <Button variant="warning" size="sm">
                          تبليغ متأخر
                        </Button>
                      </>
                    }
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Edit Order Dialog */}
        {editingOrder && (
          <EditOrderDialog
            order={editingOrder}
            open={!!editingOrder}
            onOpenChange={(open) => !open && setEditingOrder(null)}
            onSave={updateOrder}
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
        </div>
      </nav>
    </div>
  );
}
