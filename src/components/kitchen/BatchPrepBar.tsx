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
      <div className="px-4 pt-2 pb-2.5">
        {/* Title row */}
        <div className="flex items-center justify-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <ChefHat className="w-6 h-6 text-primary-foreground" />
          </div>
          <div className="text-center leading-tight">
            <p className="text-xs text-muted-foreground font-bold">
              المطبخ - قيد التجهيز
            </p>
            <p className="text-lg font-black text-primary">
              {toEnglishNumbers(orders.length.toString())} طلب · {toEnglishNumbers(totalItems.toString())} وجبة
            </p>
          </div>
        </div>

        {/* Items summary - flex-wrap grid (multi-row) */}
        {summary.length === 0 ? (
          <div className="flex items-center justify-center text-muted-foreground text-sm py-2">
            <Utensils className="w-4 h-4 ml-2" />
            لا توجد وجبات قيد التحضير
          </div>
        ) : (
          <div
            className="flex flex-wrap items-center justify-center gap-1.5 max-h-[22vh] overflow-y-auto"
          >
            {summary.map((item) => (
              <div
                key={item.name}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/30"
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
  );
}
