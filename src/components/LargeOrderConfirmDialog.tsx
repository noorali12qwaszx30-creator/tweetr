import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ShoppingCart, DollarSign, User, Send } from 'lucide-react';
import { CartItem } from '@/hooks/useCart';
import { toEnglishNumbers, formatNumberWithCommas } from '@/lib/formatNumber';

interface LargeOrderConfirmDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  totalPrice: number;
  cart: CartItem[];
  customerName: string;
  orderType: 'delivery' | 'takeaway' | 'pickup';
}

const ORDER_TYPE_LABELS: Record<string, string> = {
  delivery: 'توصيل',
  takeaway: 'سفري',
  pickup: 'استلام',
};

const PRICE_THRESHOLD = 30000;
const ITEMS_THRESHOLD = 10;

export function LargeOrderConfirmDialog({
  open,
  onConfirm,
  onCancel,
  totalPrice,
  cart,
  customerName,
  orderType,
}: LargeOrderConfirmDialogProps) {
  const isPriceLarge = totalPrice > PRICE_THRESHOLD;
  const isCountLarge = cart.length > ITEMS_THRESHOLD;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-warning">
            <AlertTriangle className="w-5 h-5" />
            تأكيد طلب كبير
          </DialogTitle>
          <DialogDescription>
            راجع تفاصيل الطلب قبل الإرسال للتأكد من عدم وجود خطأ.
          </DialogDescription>
        </DialogHeader>

        {/* Reasons */}
        <div className="space-y-2">
          {isPriceLarge && (
            <div className="flex items-center gap-2 bg-warning/10 border border-warning/30 rounded-2xl p-3">
              <DollarSign className="w-5 h-5 text-warning shrink-0" />
              <div className="text-sm">
                <span className="font-semibold">المبلغ كبير: </span>
                <span className="font-bold text-warning">
                  {formatNumberWithCommas(totalPrice)} د.ع
                </span>
              </div>
            </div>
          )}
          {isCountLarge && (
            <div className="flex items-center gap-2 bg-warning/10 border border-warning/30 rounded-2xl p-3">
              <ShoppingCart className="w-5 h-5 text-warning shrink-0" />
              <div className="text-sm">
                <span className="font-semibold">عدد الأصناف كبير: </span>
                <span className="font-bold text-warning">
                  {toEnglishNumbers(cart.length)} صنف
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Customer + type */}
        <div className="flex items-center justify-between bg-muted/50 rounded-2xl p-3 text-sm">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium">{customerName || '—'}</span>
          </div>
          <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-semibold">
            {ORDER_TYPE_LABELS[orderType] ?? orderType}
          </span>
        </div>

        {/* Items list */}
        <div className="border border-border/50 rounded-2xl overflow-hidden">
          <div className="bg-muted/40 px-3 py-2 text-xs font-semibold text-muted-foreground">
            قائمة الأصناف
          </div>
          <div className="max-h-48 overflow-y-auto divide-y divide-border/40">
            {cart.map((item) => (
              <div
                key={item.menuItem.id}
                className="flex items-center justify-between px-3 py-2 text-sm"
              >
                <span className="flex-1 truncate">{item.menuItem.name}</span>
                <span className="font-bold text-primary mx-2">
                  ×{toEnglishNumbers(item.quantity)}
                </span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {formatNumberWithCommas(item.menuItem.price * item.quantity)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="!flex-row gap-2">
          <Button variant="outline" className="flex-1" onClick={onCancel}>
            رجوع للمراجعة
          </Button>
          <Button className="flex-1" onClick={onConfirm}>
            <Send className="w-4 h-4 ml-1" />
            تأكيد الإرسال
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}