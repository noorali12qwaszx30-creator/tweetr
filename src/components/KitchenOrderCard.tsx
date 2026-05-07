import { useEffect, useState } from 'react';
import { Bike, ShoppingBag, UtensilsCrossed, Sparkles, Pencil } from 'lucide-react';
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
const FRESH_GLOW_MS = 8000;

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
  const [isFresh, setIsFresh] = useState(() => {
    const t = order.created_at.endsWith('Z') || order.created_at.includes('+') ? order.created_at : order.created_at + 'Z';
    return Date.now() - new Date(t).getTime() < FRESH_GLOW_MS;
  });

  useEffect(() => {
    const tick = () => setUrgency(computeUrgency(order.created_at));
    tick();
    const id = setInterval(tick, 5000);
    return () => clearInterval(id);
  }, [order.created_at]);

  useEffect(() => {
    if (!isFresh) return;
    const id = setTimeout(() => setIsFresh(false), FRESH_GLOW_MS);
    return () => clearTimeout(id);
  }, [isFresh]);

  const frontItems = order.items.slice(0, ITEMS_PER_PAGE);
  const backItems = order.items.slice(ITEMS_PER_PAGE);
  const hasOverflow = backItems.length > 0;

  useEffect(() => {
    if (!hasOverflow) { setShowBack(false); return; }
    const id = setInterval(() => setShowBack(prev => !prev), FLIP_INTERVAL_MS);
    return () => clearInterval(id);
  }, [hasOverflow]);

  // Tone tokens by type (used when no urgency override)
  const typeTone =
    order.type === 'delivery' ? { bar: 'from-info/15 to-info/0', accent: 'bg-info/15 text-info border-info/30', icon: Bike, label: 'توصيل' }
    : order.type === 'pickup' ? { bar: 'from-accent/15 to-accent/0', accent: 'bg-accent/15 text-accent-foreground border-accent/40', icon: ShoppingBag, label: 'استلام' }
    : { bar: 'from-success/15 to-success/0', accent: 'bg-success/15 text-success border-success/40', icon: UtensilsCrossed, label: 'سفري' };

  // Urgency overrides
  const urgencyCardClass =
    urgency === 'critical'
      ? 'border-destructive/70 ring-2 ring-destructive/40 shadow-[0_10px_40px_-10px_hsl(var(--destructive)/0.55)] animate-kitchen-shake'
      : urgency === 'warning'
      ? 'border-warning/70 ring-1 ring-warning/30 shadow-[0_10px_30px_-12px_hsl(var(--warning)/0.45)]'
      : urgency === 'reminder'
      ? 'border-warning/40'
      : 'border-border/60';

  const headerGradient =
    urgency === 'critical' ? 'from-destructive/20 to-destructive/0'
    : urgency === 'warning' ? 'from-warning/20 to-warning/0'
    : urgency === 'reminder' ? 'from-warning/10 to-warning/0'
    : typeTone.bar;

  const TypeIcon = typeTone.icon;

  const renderItemsList = (items: typeof order.items) => (
    <ul className="flex-1 px-3 py-2 overflow-auto space-y-1">
      {items.map(item => (
        <li
          key={item.id}
          className="flex items-start gap-2 px-2 py-1.5 rounded-lg hover:bg-muted/40 transition-colors"
        >
          <span className="mt-1 w-1.5 h-1.5 rounded-full bg-primary/70 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-1.5 flex-wrap">
              <span className="font-bold text-foreground text-[15px] leading-tight">{item.menu_item_name}</span>
              <span className="font-black text-primary text-base tabular-nums">
                ×{toEnglishNumbers(item.quantity.toString())}
              </span>
            </div>
            {item.notes && (
              <p className="text-warning text-[11px] mt-0.5 font-bold flex items-start gap-1">
                <span>⚠️</span>
                <span>{item.notes}</span>
              </p>
            )}
          </div>
        </li>
      ))}
    </ul>
  );

  const renderTopBar = (pageLabel?: string) => (
    <div className={`relative shrink-0 bg-gradient-to-l ${headerGradient}`}>
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="inline-flex items-center px-2.5 py-1 rounded-xl bg-primary text-primary-foreground text-sm font-black tabular-nums shadow-button">
            #{toEnglishNumbers(order.order_number.toString())}
          </span>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${typeTone.accent}`}>
            <TypeIcon className="w-3 h-3" />
            {typeTone.label}
          </span>
          {pageLabel && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-foreground/10 text-foreground tabular-nums">
              {pageLabel}
            </span>
          )}
        </div>
        <OrderTimer startTime={order.created_at} compact />
      </div>
      <div className="h-px bg-border/60" />
    </div>
  );

  const orderNotesBlock = order.notes && (
    <div className="mx-3 mb-2 p-1.5 bg-warning/10 border border-warning/30 rounded-lg shrink-0">
      <p className="text-warning text-[11px] font-bold leading-tight">⚠️ {order.notes}</p>
    </div>
  );

  const baseCardClass = `
    rounded-2xl border kitchen-glass overflow-hidden
    h-full flex flex-col transition-all duration-300
    hover:-translate-y-0.5 hover:shadow-elevated
    animate-kitchen-in
    ${isFresh ? 'animate-kitchen-glow' : ''}
    ${urgencyCardClass}
  `;

  if (!hasOverflow) {
    return (
      <Card className={baseCardClass}>
        {renderTopBar()}
        {renderItemsList(frontItems)}
        {orderNotesBlock}
        {isFresh && <FreshBadge />}
        {order.is_edited && <EditedBadge />}
      </Card>
    );
  }

  const totalPages = 2;
  const currentPage = showBack ? 2 : 1;

  return (
    <div className="h-full w-full" style={{ perspective: '1200px' }}>
      <div
        className="relative h-full w-full transition-transform duration-700"
        style={{
          transformStyle: 'preserve-3d',
          transform: showBack ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
      >
        <div className="absolute inset-0" style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}>
          <Card className={baseCardClass}>
            {renderTopBar(`${toEnglishNumbers(currentPage.toString())}/${toEnglishNumbers(totalPages.toString())}`)}
            {renderItemsList(frontItems)}
            {orderNotesBlock}
            {isFresh && <FreshBadge />}
            {order.is_edited && <EditedBadge />}
          </Card>
        </div>
        <div
          className="absolute inset-0"
          style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
        >
          <Card className={baseCardClass}>
            {renderTopBar(`${toEnglishNumbers('2')}/${toEnglishNumbers(totalPages.toString())}`)}
            {renderItemsList(backItems)}
            {orderNotesBlock}
            {order.is_edited && <EditedBadge />}
          </Card>
        </div>
      </div>
    </div>
  );
}

function EditedBadge() {
  return (
    <div
      className="absolute top-1.5 left-1.5 z-30 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-black shadow-button border border-destructive-foreground/40 animate-pulse pointer-events-none"
      style={{ animationDuration: '1s' }}
      title="تم تعديل هذا الطلب"
    >
      <Pencil className="w-3 h-3" />
      معدّل
    </div>
  );
}

function FreshBadge() {
  return (
    <div className="absolute top-1.5 right-1.5 z-30 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-l from-primary to-primary-glow text-primary-foreground text-[10px] font-black shadow-button pointer-events-none">
      <Sparkles className="w-3 h-3" />
      جديد
    </div>
  );
}
