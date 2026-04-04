import { useState, useMemo } from 'react';
import { useRole } from '@/contexts/RoleContext';
import { useAuth } from '@/contexts/AuthContext';
import { useSupabaseOrders, DbMenuItem, OrderWithItems } from '@/hooks/useSupabaseOrders';
import { useMenuItems, MenuItem } from '@/hooks/useMenuItems';
import { useDeliveryAreas } from '@/hooks/useDeliveryAreas';
import { DashboardHeader } from '@/components/shared/DashboardHeader';
import { SortableMenuItem } from '@/components/shared/SortableMenuItem';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { OrderCard } from '@/components/OrderCard';
import { CancelOrderDialog } from '@/components/CancelOrderDialog';
import { OrderDetailsDialog } from '@/components/OrderDetailsDialog';
import { LogoutConfirmButton } from '@/components/LogoutConfirmButton';
import { SmartOrderSearch } from '@/components/SmartOrderSearch';
import { toast } from 'sonner';
import { ROLE_LABELS } from '@/types';
import { toEnglishNumbers, formatNumberWithCommas, formatDateEnglish, formatTimeEnglish } from '@/lib/formatNumber';
import { Textarea } from '@/components/ui/textarea';
import { 
  ShoppingCart, 
  Trash2, 
  Send, 
  Plus, 
  Minus, 
  ClipboardList,
  Menu as MenuIcon,
  User,
  Phone,
  Settings,
  MapPin,
  MessageSquare,
  CheckCircle,
  XCircle,
  Loader2,
  ChevronDown,
  Pencil,
  AlertTriangle,
  Search
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
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

type TabType = 'menu' | 'orders' | 'search' | 'reports' | 'settings';

interface CartItem {
  menuItem: DbMenuItem;
  quantity: number;
  notes?: string;
}

export default function CashierDashboard() {
  const { role } = useRole();
  const { user } = useAuth();
  const { orders, addOrder, updateOrder, updateOrderStatus, cancelOrder, resolveIssue, loading, realtimeConnected } = useSupabaseOrders({ orderTypeFilter: 'delivery' });
  const { menuItems, categories, loading: menuLoading, updateDisplayOrder } = useMenuItems();
  const { activeAreas, loading: areasLoading } = useDeliveryAreas();
  const [activeTab, setActiveTab] = useState<TabType>('menu');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [selectedAreaId, setSelectedAreaId] = useState<string>('');
  const [areaPopoverOpen, setAreaPopoverOpen] = useState(false);
  const [orderNotes, setOrderNotes] = useState('');
  const [orderSource, setOrderSource] = useState<string>('');
  const [cancellingOrder, setCancellingOrder] = useState<OrderWithItems | null>(null);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<OrderWithItems | null>(null);
  const [editingOrder, setEditingOrder] = useState<OrderWithItems | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [animatingItemId, setAnimatingItemId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 10,
        delay: 100,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const filteredItems = useMemo(() => {
    const available = menuItems.filter(item => item.is_available);
    if (!selectedCategory) return available;
    return available.filter(item => item.category === selectedCategory);
  }, [menuItems, selectedCategory]);

  const sortedItems = [...filteredItems].sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

  const addToCart = (item: MenuItem) => {
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
    setSelectedAreaId('');
    setOrderNotes('');
    setOrderSource('');
  };

  const totalPrice = cart.reduce((sum, item) => sum + item.menuItem.price * item.quantity, 0);

  const submitOrder = async () => {
    // Detailed validation with specific error messages
    const errors: string[] = [];
    
    if (cart.length === 0) {
      toast.error('السلة فارغة - أضف أصناف للطلب');
      return;
    }

    if (!customerName.trim()) {
      errors.push('اسم الزبون');
    }
    
    if (!customerPhone.trim()) {
      errors.push('رقم الهاتف');
    } else if (customerPhone.length !== 11) {
      toast.error('رقم الهاتف يجب أن يكون 11 رقم');
      return;
    }
    
    if (!selectedAreaId) {
      errors.push('منطقة التوصيل');
    }

    if (errors.length > 0) {
      toast.error(`يرجى إدخال: ${errors.join('، ')}`);
      return;
    }

    // Store data for background submission
    const orderData = {
      customer_name: customerName.trim(),
      customer_phone: customerPhone,
      customer_address: customerAddress,
      delivery_area_id: selectedAreaId,
      notes: orderNotes || undefined,
      order_source: orderSource || undefined,
      items: cart.map(item => ({
        menu_item_id: item.menuItem.id,
        menu_item_name: item.menuItem.name,
        menu_item_price: item.menuItem.price,
        quantity: item.quantity,
        notes: item.notes,
      })),
    };

    const isEditing = editingOrder;
    const editingOrderId = editingOrder?.id;
    const roleName = role ? ROLE_LABELS[role] : 'كاشير';

    // Clear form immediately for new order entry
    clearCart();
    if (isEditing) {
      setEditingOrder(null);
    }

    // Show brief toast and start background submission
    toast.info(isEditing ? 'جاري حفظ التعديلات...' : 'جاري إرسال الطلب...', { duration: 1500 });

    // Background submission - don't await
    (async () => {
      try {
        let result;
        if (isEditing && editingOrderId) {
          result = await updateOrder(editingOrderId, orderData);
        } else {
          result = await addOrder({
            ...orderData,
            type: 'delivery',
            cashier_name: roleName,
          });
        }

        if (result) {
          toast.success(isEditing ? 'تم حفظ التعديلات بنجاح' : 'تم إرسال الطلب بنجاح');
        } else {
          toast.error('حدث خطأ أثناء إرسال الطلب');
        }
      } catch (error) {
        console.error('Order submission error:', error);
        toast.error('حدث خطأ في الاتصال');
      }
    })();
  };

  const handleEditOrder = (order: OrderWithItems) => {
    // Populate cart with order items for editing
    setCart(order.items.map(item => ({
      menuItem: {
        id: item.menu_item_id || '',
        name: item.menu_item_name,
        price: Number(item.menu_item_price),
        image: null,
        category: '',
        is_available: true,
        display_order: 0,
        created_at: '',
        updated_at: '',
      },
      quantity: item.quantity,
      notes: item.notes || undefined,
    })));
    setCustomerName(order.customer_name);
    setCustomerPhone(order.customer_phone);
    setCustomerAddress(order.customer_address || '');
    setSelectedAreaId(order.delivery_area_id || '');
    setOrderNotes(order.notes || '');
    setOrderSource(order.order_source || '');
    setEditingOrder(order);
    setActiveTab('menu');
    toast.info(`جاري تعديل الطلب #${order.order_number}`);
  };

  const cancelEdit = () => {
    clearCart();
    setEditingOrder(null);
    toast.info('تم إلغاء التعديل');
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
  const ordersWithIssues = orders.filter(o => o.has_issue === true && o.status !== 'cancelled');

  const handleResolveIssue = async (orderId: string) => {
    await resolveIssue(orderId);
  };
  if (loading || menuLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-dvh bg-background">
      <DashboardHeader 
        title="كاشير" 
        subtitle={user?.fullName || user?.username || ''} 
        icon={ShoppingCart} 
        iconClassName="gradient-primary"
        realtimeConnected={realtimeConnected}
        showConnectionIndicator={true}
      />

      {/* Main Content */}
      <main className="container py-3 space-y-4 flex-1 overflow-auto">
        {/* Editing Mode Banner */}
        {editingOrder && (
          <div className="bg-warning/20 border border-warning/50 rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Pencil className="w-4 h-4 text-warning" />
              <span className="font-semibold text-sm text-warning">
                جاري تعديل الطلب <span className="px-1.5 py-0.5 border border-warning/50 rounded bg-warning/10">{editingOrder.order_number}</span>
              </span>
            </div>
            <Button variant="ghost" size="sm" onClick={cancelEdit} className="text-destructive">
              <XCircle className="w-4 h-4 ml-1" />
              إلغاء التعديل
            </Button>
          </div>
        )}

        {activeTab === 'menu' && (
          <>
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
                    placeholder="رقم الهاتف (11 رقم)"
                    value={customerPhone}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 11);
                      setCustomerPhone(value);
                    }}
                    inputMode="numeric"
                    pattern="[0-9]{11}"
                    maxLength={11}
                    className="pr-7 h-9 text-sm"
                  />
                </div>
                <div className="col-span-2">
                  <Popover open={areaPopoverOpen} onOpenChange={setAreaPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={areaPopoverOpen}
                        className="w-full justify-between h-9 text-sm font-normal"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
                          <span className="truncate">
                            {selectedAreaId
                              ? activeAreas.find(a => a.id === selectedAreaId)?.name || 'اختر المنطقة'
                              : 'اختر المنطقة'}
                          </span>
                        </div>
                        <ChevronDown className="w-3 h-3 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                      <Command dir="rtl">
                        <CommandInput placeholder="ابحث عن منطقة..." />
                        <CommandList>
                          <CommandEmpty>لا توجد نتائج</CommandEmpty>
                          <CommandGroup>
                            {areasLoading ? (
                              <div className="flex items-center justify-center py-2">
                                <Loader2 className="w-4 h-4 animate-spin" />
                              </div>
                            ) : (
                              activeAreas.map(area => (
                                <CommandItem
                                  key={area.id}
                                  value={area.name}
                                  onSelect={() => {
                                    setSelectedAreaId(area.id);
                                    setCustomerAddress(area.name);
                                    setAreaPopoverOpen(false);
                                  }}
                                  className={selectedAreaId === area.id ? 'bg-accent' : ''}
                                >
                                  {area.name}
                                </CommandItem>
                              ))
                            )}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="col-span-2">
                  <Select value={orderSource} onValueChange={setOrderSource}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="مصدر الطلب (اختياري)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="instagram">انستقرام</SelectItem>
                      <SelectItem value="telegram">تلقرام</SelectItem>
                      <SelectItem value="phone">الخط</SelectItem>
                      <SelectItem value="whatsapp">واتساب</SelectItem>
                      <SelectItem value="local">محلي</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Cart Summary */}
            {cart.length > 0 && (
              <div className="bg-primary/10 border border-primary/20 rounded-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="font-bold text-sm flex items-center gap-2">
                    <ShoppingCart className="w-4 h-4 text-primary" />
                    السلة ({toEnglishNumbers(cart.length)})
                  </h2>
                  <span className="font-bold text-primary">{formatNumberWithCommas(totalPrice)} د.ع</span>
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
                  <Button variant="destructive" size="sm" className="flex-1" onClick={editingOrder ? cancelEdit : clearCart}>
                    <Trash2 className="w-3 h-3 ml-1" />
                    {editingOrder ? 'إلغاء التعديل' : 'مسح'}
                  </Button>
                  <Button size="sm" className={`flex-1 ${editingOrder ? 'bg-warning hover:bg-warning/90' : ''}`} onClick={submitOrder}>
                    <Send className="w-3 h-3 ml-1" />
                    {editingOrder ? 'حفظ التعديلات' : 'إرسال'}
                  </Button>
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
                        <Button variant="outline" size="sm" onClick={() => handleEditOrder(order)}>
                          <Pencil className="w-3 h-3 ml-1" />
                          تعديل
                        </Button>
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

        {activeTab === 'search' && (
          <SmartOrderSearch
            orders={orders}
            onEditOrder={handleEditOrder}
            onCancelOrder={(order) => setCancellingOrder(order)}
          />
        )}

        {activeTab === 'reports' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-destructive" />
                البلاغات ({toEnglishNumbers(ordersWithIssues.length)})
              </h2>
            </div>
            
            {ordersWithIssues.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>لا توجد بلاغات حالياً</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {ordersWithIssues.map(order => (
                  <div key={order.id} className="bg-card border-2 border-destructive/50 rounded-xl p-4 shadow-soft">
                    {/* Issue Banner */}
                    <div className="mb-3 p-3 bg-destructive/20 border border-destructive/40 rounded-lg">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2 text-destructive font-bold">
                          <AlertTriangle className="w-5 h-5" />
                          <span>{order.issue_reason}</span>
                        </div>
                        <div className="text-xs text-destructive/80">
                          {order.issue_reported_by && <span>من: {order.issue_reported_by}</span>}
                          {order.issue_reported_at && (
                            <span className="mr-2">
                              • {formatDateEnglish(order.issue_reported_at)} {formatTimeEnglish(order.issue_reported_at)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Order Info */}
                    <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl font-bold text-primary px-2 py-0.5 border-2 border-primary/30 rounded-lg bg-primary/5">
                          {toEnglishNumbers(order.order_number)}
                        </span>
                        <div>
                          <p className="font-semibold">{order.customer_name}</p>
                          <p className="text-sm text-muted-foreground">{toEnglishNumbers(order.customer_phone)}</p>
                        </div>
                      </div>
                      {order.delivery_person_name && (
                        <div className="text-sm text-info">
                          موظف التوصيل: {order.delivery_person_name}
                        </div>
                      )}
                    </div>

                    {/* Items Summary */}
                    <div className="mb-3 p-2 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">الأصناف:</p>
                      <div className="flex flex-wrap gap-2">
                        {order.items.map((item, idx) => (
                          <span key={idx} className="text-xs bg-background px-2 py-1 rounded">
                            {toEnglishNumbers(item.quantity)}× {item.menu_item_name}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 flex-wrap">
                      <Button 
                        variant="success" 
                        size="sm" 
                        onClick={() => handleResolveIssue(order.id)}
                      >
                        <CheckCircle className="w-3 h-3 ml-1" />
                        تم الحل
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setSelectedOrderDetails(order)}
                      >
                        عرض التفاصيل
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleEditOrder(order)}
                      >
                        <Pencil className="w-3 h-3 ml-1" />
                        تعديل الطلب
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">الإعدادات</h2>
            
            {/* Completed Orders */}
            <div className="bg-card border border-border rounded-xl p-4">
              <h3 className="font-bold text-sm mb-3 flex items-center gap-2 text-success">
                <CheckCircle className="w-4 h-4" />
                الطلبات المكتملة ({toEnglishNumbers(orders.filter(o => o.status === 'delivered' && o.type === 'delivery').length)})
              </h3>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {orders.filter(o => o.status === 'delivered' && o.type === 'delivery').length === 0 ? (
                  <p className="text-center text-muted-foreground text-sm py-4">لا توجد طلبات مكتملة</p>
                ) : (
                  orders.filter(o => o.status === 'delivered' && o.type === 'delivery').map(order => (
                    <div 
                      key={order.id} 
                      className="bg-success/10 border border-success/20 rounded-lg p-3 cursor-pointer hover:bg-success/20 transition-colors"
                      onClick={() => setSelectedOrderDetails(order)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-success">طلب #{toEnglishNumbers(order.order_number)}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatDateEnglish(order.delivered_at || order.updated_at)} {formatTimeEnglish(order.delivered_at || order.updated_at)}
                        </span>
                      </div>
                      <div className="text-sm space-y-1">
                        <p className="flex items-center gap-2">
                          <User className="w-3 h-3" />
                          {order.customer_name}
                        </p>
                        {order.delivery_person_name && (
                          <p className="flex items-center gap-2 text-muted-foreground">
                            <span>موظف التوصيل:</span>
                            <span className="font-medium text-foreground">{order.delivery_person_name}</span>
                          </p>
                        )}
                        <p className="font-semibold text-primary">
                          المجموع: {formatNumberWithCommas(Number(order.total_price))} د.ع
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Cancelled Orders */}
            <div className="bg-card border border-border rounded-xl p-4">
              <h3 className="font-bold text-sm mb-3 flex items-center gap-2 text-destructive">
                <XCircle className="w-4 h-4" />
                الطلبات الملغية ({toEnglishNumbers(orders.filter(o => o.status === 'cancelled' && o.type === 'delivery').length)})
              </h3>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {orders.filter(o => o.status === 'cancelled' && o.type === 'delivery').length === 0 ? (
                  <p className="text-center text-muted-foreground text-sm py-4">لا توجد طلبات ملغية</p>
                ) : (
                  orders.filter(o => o.status === 'cancelled' && o.type === 'delivery').map(order => (
                    <div 
                      key={order.id} 
                      className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 cursor-pointer hover:bg-destructive/20 transition-colors"
                      onClick={() => setSelectedOrderDetails(order)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-destructive">طلب #{toEnglishNumbers(order.order_number)}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatDateEnglish(order.cancelled_at || order.updated_at)} {formatTimeEnglish(order.cancelled_at || order.updated_at)}
                        </span>
                      </div>
                      <div className="text-sm space-y-1">
                        <p className="flex items-center gap-2">
                          <User className="w-3 h-3" />
                          {order.customer_name}
                        </p>
                        {order.cancellation_reason && (
                          <p className="text-destructive text-xs">
                            سبب الإلغاء: {order.cancellation_reason}
                          </p>
                        )}
                        <p className="font-semibold text-primary">
                          المجموع: {formatNumberWithCommas(Number(order.total_price))} د.ع
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="grid gap-4">
              <LogoutConfirmButton />
            </div>
          </div>
        )}

        {/* Cancel Order Dialog */}
        {cancellingOrder && (
          <CancelOrderDialog
            orderId={cancellingOrder.id}
            orderNumber={cancellingOrder.order_number}
            open={!!cancellingOrder}
            onOpenChange={(open) => !open && setCancellingOrder(null)}
            onCancel={handleCancelOrder}
          />
        )}

        {/* Order Details Dialog */}
        <OrderDetailsDialog
          order={selectedOrderDetails}
          open={!!selectedOrderDetails}
          onOpenChange={(open) => !open && setSelectedOrderDetails(null)}
        />
      </main>

      {/* Bottom Navigation */}
      <nav className="bg-card border-t border-border shadow-elevated pb-safe shrink-0">
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
            onClick={() => setActiveTab('search')}
            className={`flex-1 py-3 flex flex-col items-center gap-1 transition-colors ${
              activeTab === 'search' ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <Search className="w-5 h-5" />
            <span className="text-xs font-medium">بحث</span>
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`flex-1 py-3 flex flex-col items-center gap-1 transition-colors relative ${
              activeTab === 'reports' ? 'text-destructive' : 'text-muted-foreground'
            }`}
          >
            <AlertTriangle className="w-5 h-5" />
            <span className="text-xs font-medium">البلاغات</span>
            {ordersWithIssues.length > 0 && (
              <span className="absolute top-1 right-1/2 translate-x-4 w-5 h-5 bg-destructive text-destructive-foreground rounded-full text-xs flex items-center justify-center animate-pulse">
                {ordersWithIssues.length}
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
