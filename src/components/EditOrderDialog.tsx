import { useState } from 'react';
import { Order, OrderItem, MenuItem } from '@/types';
import { MENU_ITEMS } from '@/contexts/OrderContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Trash2, 
  Plus, 
  Minus, 
  User,
  Phone,
  MapPin,
  MessageSquare,
  Save
} from 'lucide-react';
import { toast } from 'sonner';

interface EditOrderDialogProps {
  order: Order;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (orderId: string, updates: Partial<Order>) => void;
}

export function EditOrderDialog({ order, open, onOpenChange, onSave }: EditOrderDialogProps) {
  const [items, setItems] = useState<OrderItem[]>(order.items);
  const [customerName, setCustomerName] = useState(order.customer.name);
  const [customerPhone, setCustomerPhone] = useState(order.customer.phone);
  const [customerAddress, setCustomerAddress] = useState(order.customer.address);
  const [notes, setNotes] = useState(order.notes || '');

  const updateQuantity = (itemId: string, delta: number) => {
    setItems(prev => {
      return prev.map(i => {
        if (i.menuItem.id === itemId) {
          const newQty = i.quantity + delta;
          return newQty > 0 ? { ...i, quantity: newQty } : i;
        }
        return i;
      }).filter(i => i.quantity > 0);
    });
  };

  const removeItem = (itemId: string) => {
    setItems(prev => prev.filter(i => i.menuItem.id !== itemId));
  };

  const addItem = (item: MenuItem) => {
    setItems(prev => {
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

  const totalPrice = items.reduce((sum, item) => sum + item.menuItem.price * item.quantity, 0);

  const handleSave = () => {
    if (items.length === 0) {
      toast.error('يجب أن يحتوي الطلب على صنف واحد على الأقل');
      return;
    }

    if (!customerName || !customerPhone || !customerAddress) {
      toast.error('يرجى إدخال بيانات الزبون كاملة');
      return;
    }

    onSave(order.id, {
      items,
      customer: {
        name: customerName,
        phone: customerPhone,
        address: customerAddress,
      },
      notes: notes || undefined,
      totalPrice,
    });

    toast.success('تم تحديث الطلب بنجاح');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>تعديل الطلب #{order.orderNumber}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Items */}
          <div className="space-y-2">
            <h3 className="font-semibold">عناصر الطلب</h3>
            {items.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">لا توجد عناصر</p>
            ) : (
              <div className="space-y-2">
                {items.map(item => (
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
                    <span className="flex-1 text-sm">{item.menuItem.name}</span>
                    <span className="text-sm text-muted-foreground">
                      {(item.menuItem.price * item.quantity).toLocaleString()} د.ع
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => removeItem(item.menuItem.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Add Items */}
            <div className="pt-2">
              <h4 className="text-sm font-medium mb-2">إضافة عنصر</h4>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-40 overflow-y-auto">
                {MENU_ITEMS.map(item => (
                  <Button
                    key={item.id}
                    variant="outline"
                    size="sm"
                    className="text-xs h-auto py-2"
                    onClick={() => addItem(item)}
                  >
                    <Plus className="w-3 h-3 ml-1" />
                    {item.name}
                  </Button>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-border">
              <div className="flex justify-between font-bold">
                <span>المجموع</span>
                <span className="text-primary">{totalPrice.toLocaleString()} د.ع</span>
              </div>
            </div>
          </div>

          {/* Customer Info */}
          <div className="space-y-3">
            <h3 className="font-semibold">بيانات الزبون</h3>
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
              <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
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
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="pr-10 min-h-[80px]"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              إلغاء
            </Button>
            <Button className="flex-1" onClick={handleSave}>
              <Save className="w-4 h-4 ml-2" />
              حفظ التغييرات
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
