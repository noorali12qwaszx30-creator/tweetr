import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { OrderTimer } from '@/components/OrderTimer';
import { OrderWithItems } from '@/hooks/useSupabaseOrders';
import { toEnglishNumbers } from '@/lib/formatNumber';

interface KitchenOrderCardProps {
  order: OrderWithItems;
}

type Urgency = 'normal' | 'reminder' | 'warning' | 'critical';

function computeUrgency(createdAt: string): Urgency {
  const timeStr = createdAt.endsWith('Z') || createdAt.includes('+') ? createdAt : createdAt + 'Z';
  const start = new Date(timeStr).getTime();
  const minutes = Math.floor((Date.now() - start) / 60000);
  if (minutes >= 30) return 'critical';
  if (minutes >= 20) return 'warning';
  if (minutes >= 10) return 'reminder';
  return 'normal';
}

export function KitchenOrderCard({ order }: KitchenOrderCardProps) {
  const [urgency, setUrgency] = useState<Urgency>(() => computeUrgency(order.created_at));

  useEffect(() => {
    const tick = () => setUrgency(computeUrgency(order.created_at));
    tick();
    const id = setInterval(tick, 5000);
    return () => clearInterval(id);
  }, [order.created_at]);

  // Base type-based colors (used only when not urgent)
  const typeBg =
    order.type === 'delivery'
      ? 'bg-info/5 border-info/40'
      : order.type === 'pickup'
      ? 'bg-accent/5 border-accent/40'
      : 'bg-success/5 border-success/40';

  const typeBar =
    order.type === 'delivery'
      ? 'bg-info/40 border-b-2 border-info'
      : order.type === 'pickup'
      ? 'bg-accent/40 border-b-2 border-accent'
      : 'bg-success/40 border-b-2 border-success';

  // Urgency overrides — escalate the whole card visually
  const urgencyCardClass =
    urgency === 'critical'
      ? 'bg-destructive/20 border-destructive border-[3px] shadow-lg shadow-destructive/40 animate-pulse'
      : urgency === 'warning'
      ? 'bg-warning/15 border-warning border-[3px] animate-pulse'
      : urgency === 'reminder'
      ? 'bg-warning/5 border-warning/50'
      : typeBg;

  const urgencyBarClass =
    urgency === 'critical'
      ? 'bg-destructive/40 border-b-2 border-destructive'
      : urgency === 'warning'
      ? 'bg-warning/40 border-b-2 border-warning'
      : urgency === 'reminder'
      ? 'bg-warning/20 border-b-2 border-warning/60'
      : typeBar;

  const pulseStyle =
    urgency === 'critical'
      ? { animationDuration: '0.5s' }
      : urgency === 'warning'
      ? { animationDuration: '1.5s' }
      : undefined;

  return (
    <Card
      className={`rounded-2xl border-2 hover:shadow-elevated transition-colors duration-300 h-full flex flex-col overflow-hidden ${urgencyCardClass}`}
      style={pulseStyle}
    >
      {/* Unified top bar */}
      <div className={`flex items-center justify-between px-3 py-2 shrink-0 ${urgencyBarClass}`}>
        <div className="flex items-center gap-1 min-w-0">
          <span className="text-base font-black text-primary whitespace-nowrap">
            #{toEnglishNumbers(order.order_number.toString())}
          </span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${
            order.type === 'delivery' ? 'bg-info/30 text-info' : order.type === 'pickup' ? 'bg-accent/30 text-accent-foreground' : 'bg-success/30 text-success'
          }`}>
            {order.type === 'delivery' ? 'توصيل' : order.type === 'pickup' ? 'استلام' : 'سفري'}
          </span>
        </div>
        <OrderTimer startTime={order.created_at} />
      </div>
      
      {/* Items list */}
      <ul className="space-y-0.5 flex-1 p-2 overflow-auto">
        {order.items.map(item => (
          <li key={item.id} className="text-sm">
            <div className="flex items-start gap-1">
              <div className="flex-1">
                <span className="font-bold text-foreground text-base">{item.menu_item_name}</span>
                <span className="font-black text-primary mr-1">
                  ×{toEnglishNumbers(item.quantity.toString())}
                </span>
                {item.notes && (
                  <p className="text-warning text-[10px] mt-0.5 font-medium">
                    ⚠️ {item.notes}
                  </p>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
      
      {/* Order notes */}
      {order.notes && (
        <div className="mx-2 mb-2 p-1.5 bg-warning/10 border border-warning/30 rounded shrink-0">
          <p className="text-warning text-[10px] font-bold">
            ⚠️ {order.notes}
          </p>
        </div>
      )}
    </Card>
  );
}
