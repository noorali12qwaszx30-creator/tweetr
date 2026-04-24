import { useMemo } from 'react';
import { ChefHat, Utensils } from 'lucide-react';
import { OrderWithItems } from '@/hooks/useSupabaseOrders';
import { toEnglishNumbers } from '@/lib/formatNumber';

interface BatchPrepBarProps {
  orders: OrderWithItems[];
}

interface ItemSummary {
  name: string;
  quantity: number;
}

/**
 * Aggregates all items across active orders so the kitchen sees totals
 * for batch prep (e.g. Burger ×15, Fries ×8) instead of per-order totals.
 */
export function BatchPrepBar({ orders }: BatchPrepBarProps) {
  const summary = useMemo<ItemSummary[]>(() => {
    const map = new Map<string, number>();
    for (const order of orders) {
      for (const item of order.items) {
        const prev = map.get(item.menu_item_name) ?? 0;
        map.set(item.menu_item_name, prev + item.quantity);
      }
    }
    return Array.from(map.entries())
      .map(([name, quantity]) => ({ name, quantity }))
      .sort((a, b) => b.quantity - a.quantity);
  }, [orders]);

  const totalItems = summary.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <div className="bg-card border-b-2 border-border shadow-md sticky top-0 z-40">
      <div className="container px-4 py-2.5">
        <div className="flex items-center gap-3">
          {/* Title chip */}
          <div className="flex items-center gap-2 shrink-0 pl-3 pr-2 border-l-2 border-border">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
              <ChefHat className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="text-right leading-tight">
              <p className="text-[10px] text-muted-foreground font-bold">
                المطبخ - قيد التجهيز
              </p>
              <p className="text-base font-black text-primary">
                {toEnglishNumbers(orders.length.toString())} طلب · {toEnglishNumbers(totalItems.toString())} وجبة
              </p>
            </div>
          </div>

          {/* Items summary - horizontal scroll */}
          {summary.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm py-2">
              <Utensils className="w-4 h-4 ml-2" />
              لا توجد وجبات قيد التحضير
            </div>
          ) : (
            <div className="flex-1 flex items-center gap-2 overflow-x-auto py-1 scrollbar-thin">
              {summary.map((item) => (
                <div
                  key={item.name}
                  className="shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-primary/10 border-2 border-primary/30"
                >
                  <span className="text-sm font-bold text-foreground whitespace-nowrap">
                    {item.name}
                  </span>
                  <span className="text-base font-black text-primary whitespace-nowrap">
                    ×{toEnglishNumbers(item.quantity.toString())}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
