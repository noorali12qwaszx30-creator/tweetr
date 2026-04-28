import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { OrderTimer } from '@/components/OrderTimer';
import { OrderWithItems } from '@/hooks/useSupabaseOrders';
import { toEnglishNumbers } from '@/lib/formatNumber';

interface KitchenOrderCardProps {
  order: OrderWithItems;
}

type Urgency = 'normal' | 'reminder' | 'warning' | 'critical';

const ITEMS_PER_PAGE = 5;
const FLIP_INTERVAL_MS = 4000;

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
  const [showBack, setShowBack] = useState(false);

  useEffect(() => {
    const tick = () => setUrgency(computeUrgency(order.created_at));
    tick();
    const id = setInterval(tick, 5000);
    return () => clearInterval(id);
  }, [order.created_at]);

  // Split items into front (first 5) and back (the rest)
  const frontItems = order.items.slice(0, ITEMS_PER_PAGE);
  const backItems = order.items.slice(ITEMS_PER_PAGE);
  const hasOverflow = backItems.length > 0;

  // Auto-flip every few seconds when there's overflow
  useEffect(() => {
    if (!hasOverflow) {
      setShowBack(false);
      return;
    }
    const id = setInterval(() => setShowBack(prev => !prev), FLIP_INTERVAL_MS);
    return () => clearInterval(id);
  }, [hasOverflow]);

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

  const renderItemsList = (items: typeof order.items) => (
    <ul className="space-y-0.5 flex-1 p-2 overflow-auto">
      {items.map(item => (
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
  );

  const renderTopBar = (pageLabel?: string) => (
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
        {pageLabel && (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary/20 text-primary whitespace-nowrap">
            {pageLabel}
          </span>
        )}
      </div>
      <OrderTimer startTime={order.created_at} />
    </div>
  );

  const orderNotesBlock = order.notes && (
    <div className="mx-2 mb-2 p-1.5 bg-warning/10 border border-warning/30 rounded shrink-0">
      <p className="text-warning text-[10px] font-bold">
        ⚠️ {order.notes}
      </p>
    </div>
  );

  // No overflow → render the original simple card
  if (!hasOverflow) {
    return (
      <Card
        className={`rounded-2xl border-2 hover:shadow-elevated transition-colors duration-300 h-full flex flex-col overflow-hidden ${urgencyCardClass}`}
        style={pulseStyle}
      >
        {order.is_edited && <EditedRibbon />}
        {renderTopBar()}
        {renderItemsList(frontItems)}
        {orderNotesBlock}
      </Card>
    );
  }

  // Overflow → 3D flip card
  const totalPages = 2;
  const currentPage = showBack ? 2 : 1;

  return (
    <div
      className="h-full w-full"
      style={{ perspective: '1200px' }}
    >
      <div
        className="relative h-full w-full transition-transform duration-700"
        style={{
          transformStyle: 'preserve-3d',
          transform: showBack ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
      >
        {/* Front face */}
        <div
          className="absolute inset-0"
          style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
        >
          <Card
            className={`rounded-2xl border-2 hover:shadow-elevated transition-colors duration-300 h-full flex flex-col overflow-hidden ${urgencyCardClass}`}
            style={pulseStyle}
          >
            {order.is_edited && <EditedRibbon />}
            {renderTopBar(`${toEnglishNumbers(currentPage.toString())}/${toEnglishNumbers(totalPages.toString())}`)}
            {renderItemsList(frontItems)}
            {orderNotesBlock}
          </Card>
        </div>

        {/* Back face */}
        <div
          className="absolute inset-0"
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
          }}
        >
          <Card
            className={`rounded-2xl border-2 hover:shadow-elevated transition-colors duration-300 h-full flex flex-col overflow-hidden ${urgencyCardClass}`}
            style={pulseStyle}
          >
            {order.is_edited && <EditedRibbon />}
            {renderTopBar(`${toEnglishNumbers('2')}/${toEnglishNumbers(totalPages.toString())}`)}
            {renderItemsList(backItems)}
            {orderNotesBlock}
          </Card>
        </div>
      </div>
    </div>
  );
}

function EditedRibbon() {
  // Red banner sits at the very top of the affected order card only —
  // not at a screen corner — so kitchen staff immediately see WHICH order changed.
  return (
    <div
      className="w-full bg-destructive text-destructive-foreground text-center font-black text-sm py-1.5 shrink-0 animate-pulse border-b-2 border-destructive-foreground/40 z-20"
      style={{ animationDuration: '1s' }}
    >
      ✏️ تم تعديل هذا الطلب — يرجى المراجعة
    </div>
  );
}
