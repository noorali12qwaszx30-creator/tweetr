import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ShoppingCart, Trash2, Send, Plus, Minus, MessageSquare, Loader2 } from 'lucide-react';
import { toEnglishNumbers, formatNumberWithCommas } from '@/lib/formatNumber';
import { CartItem } from '@/hooks/useCart';

interface CartSummaryProps {
  cart: CartItem[];
  totalPrice: number;
  orderNotes: string;
  onOrderNotesChange: (notes: string) => void;
  onUpdateQuantity: (itemId: string, delta: number) => void;
  onRemoveItem: (itemId: string) => void;
  onClear: () => void;
  onSubmit: () => void;
  isSubmitting?: boolean;
  title?: string;
  variant?: 'primary' | 'warning';
}

export function CartSummary({
  cart,
  totalPrice,
  orderNotes,
  onOrderNotesChange,
  onUpdateQuantity,
  onRemoveItem,
  onClear,
  onSubmit,
  isSubmitting = false,
  title = 'السلة',
  variant = 'primary'
}: CartSummaryProps) {
  if (cart.length === 0) return null;

  const accentClass = variant === 'warning' ? 'warning' : 'primary';

  return (
    <div className={`bg-${accentClass}/10 border border-${accentClass}/30 rounded-xl p-3`}>
      <div className="flex items-center justify-between mb-2">
        <h2 className={`font-bold text-sm flex items-center gap-2 text-${accentClass}`}>
          <ShoppingCart className="w-4 h-4" />
          {title} ({toEnglishNumbers(cart.length)})
        </h2>
        <span className={`font-bold text-${accentClass}`}>{formatNumberWithCommas(totalPrice)} د.ع</span>
      </div>
      <div className="space-y-2 max-h-32 overflow-y-auto">
        {cart.map(item => (
          <div key={item.menuItem.id} className="flex items-center gap-2 text-sm bg-background/50 rounded-lg p-2">
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onUpdateQuantity(item.menuItem.id, -1)}>
                <Minus className="w-3 h-3" />
              </Button>
              <span className="w-5 text-center font-semibold text-xs">{toEnglishNumbers(item.quantity)}</span>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onUpdateQuantity(item.menuItem.id, 1)}>
                <Plus className="w-3 h-3" />
              </Button>
            </div>
            <span className="flex-1 truncate text-xs">{item.menuItem.name}</span>
            <span className="text-xs text-muted-foreground">{formatNumberWithCommas(item.menuItem.price * item.quantity)}</span>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => onRemoveItem(item.menuItem.id)}>
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
          onChange={(e) => onOrderNotesChange(e.target.value)}
          className="pr-7 min-h-[50px] text-sm"
        />
      </div>
      <div className="flex gap-2 mt-2">
        <Button variant="destructive" size="sm" className="flex-1" onClick={onClear}>
          <Trash2 className="w-3 h-3 ml-1" />
          مسح
        </Button>
        <Button 
          variant={variant === 'warning' ? 'warning' : 'default'} 
          size="sm" 
          className="flex-1" 
          onClick={onSubmit} 
          disabled={isSubmitting}
        >
          {isSubmitting ? <Loader2 className="w-3 h-3 ml-1 animate-spin" /> : <Send className="w-3 h-3 ml-1" />}
          إرسال
        </Button>
      </div>
    </div>
  );
}
