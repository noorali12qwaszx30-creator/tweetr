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
    <div className={`bg-card border border-${accentClass}/20 rounded-3xl p-4 shadow-elevated`}>
      <div className="flex items-center justify-between mb-3">
        <h2 className={`font-bold text-sm flex items-center gap-2 text-${accentClass}`}>
          <span className={`w-8 h-8 rounded-full bg-${accentClass}/15 flex items-center justify-center`}>
            <ShoppingCart className="w-4 h-4" />
          </span>
          {title} ({toEnglishNumbers(cart.length)})
        </h2>
        <span className={`font-bold text-${accentClass} text-base`}>{formatNumberWithCommas(totalPrice)} <span className="text-xs opacity-70">د.ع</span></span>
      </div>
      <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
        {cart.map(item => (
          <div key={item.menuItem.id} className="flex items-center gap-2 text-sm bg-muted/50 rounded-2xl p-2">
            <div className={`flex items-center gap-1 bg-card rounded-full p-0.5 border border-${accentClass}/20`}>
              <Button variant="ghost" size="icon" className={`h-6 w-6 rounded-full text-${accentClass} hover:bg-${accentClass}/10`} onClick={() => onUpdateQuantity(item.menuItem.id, -1)}>
                <Minus className="w-3 h-3" />
              </Button>
              <span className="w-5 text-center font-semibold text-xs">{toEnglishNumbers(item.quantity)}</span>
              <Button variant="ghost" size="icon" className={`h-6 w-6 rounded-full text-${accentClass} hover:bg-${accentClass}/10`} onClick={() => onUpdateQuantity(item.menuItem.id, 1)}>
                <Plus className="w-3 h-3" />
              </Button>
            </div>
            <span className="flex-1 truncate text-xs font-medium">{item.menuItem.name}</span>
            <span className="text-xs text-muted-foreground">{formatNumberWithCommas(item.menuItem.price * item.quantity)}</span>
            <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full text-destructive hover:bg-destructive/10" onClick={() => onRemoveItem(item.menuItem.id)}>
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        ))}
      </div>
      <div className="relative mt-3">
        <MessageSquare className="absolute right-3 top-3 w-3.5 h-3.5 text-muted-foreground" />
        <Textarea
          placeholder="ملاحظات (اختياري)"
          value={orderNotes}
          onChange={(e) => onOrderNotesChange(e.target.value)}
          className="pr-9 min-h-[50px] text-sm rounded-2xl bg-muted/40 border-border/40 focus-visible:ring-primary/30"
        />
      </div>
      <div className="flex gap-2 mt-3">
        <Button variant="outline" size="sm" className="flex-1 border-destructive/30 text-destructive hover:bg-destructive hover:text-destructive-foreground hover:border-destructive" onClick={onClear}>
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
