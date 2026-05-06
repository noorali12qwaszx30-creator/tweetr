import { useMemo } from 'react';
import { ChefHat, Utensils, Flame, Clock, AlertTriangle, TrendingUp } from 'lucide-react';
import { OrderWithItems } from '@/hooks/useSupabaseOrders';
import { toEnglishNumbers } from '@/lib/formatNumber';

interface BatchPrepBarProps {
  orders: OrderWithItems[];
}

interface ItemSummary {
  name: string;
  quantity: number;
}

function ageMinutes(createdAt: string) {
  const t = createdAt.endsWith('Z') || createdAt.includes('+') ? createdAt : createdAt + 'Z';
  return Math.floor((Date.now() - new Date(t).getTime()) / 60000);
}

export function BatchPrepBar({ orders }: BatchPrepBarProps) {
  const summary = useMemo<ItemSummary[]>(() => {
    const map = new Map<string, number>();
    for (const order of orders) {
      for (const item of order.items) {
        map.set(item.menu_item_name, (map.get(item.menu_item_name) ?? 0) + item.quantity);
      }
    }
    return Array.from(map.entries())
      .map(([name, quantity]) => ({ name, quantity }))
      .sort((a, b) => b.quantity - a.quantity);
  }, [orders]);

  const totalItems = summary.reduce((sum, i) => sum + i.quantity, 0);
  const topItem = summary[0];

  const stats = useMemo(() => {
    let late = 0, warning = 0, fresh = 0;
    for (const o of orders) {
      const m = ageMinutes(o.created_at);
      if (m >= 30) late++;
      else if (m >= 20) warning++;
      else fresh++;
    }
    return { late, warning, fresh };
  }, [orders]);

  return (
    <div className="sticky top-0 z-40 border-b border-border/40 kitchen-glass shadow-sm">
      <div className="px-4 pt-2.5 pb-2">
        {/* Header row: brand + KPIs */}
        <div className="flex items-center gap-3 mb-2">
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-primary-glow shadow-button flex items-center justify-center">
              <ChefHat className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="leading-tight">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Kitchen · مباشر</p>
              <p className="text-base font-black text-foreground">
                {toEnglishNumbers(orders.length.toString())} طلب
                <span className="text-muted-foreground font-bold mx-1.5">·</span>
                {toEnglishNumbers(totalItems.toString())} وجبة
              </p>
            </div>
          </div>

          <div className="flex-1" />

          {/* KPI capsules */}
          <div className="flex items-center gap-1.5">
            <Kpi icon={Flame} label="جديد" value={stats.fresh} tone="info" />
            <Kpi icon={Clock} label="ينتظر" value={stats.warning} tone="warning" />
            <Kpi icon={AlertTriangle} label="متأخر" value={stats.late} tone="destructive" pulse={stats.late > 0} />
          </div>
        </div>

        {/* Top item highlight + items chips */}
        {summary.length === 0 ? (
          <div className="flex items-center justify-center text-muted-foreground text-sm py-1.5">
            <Utensils className="w-4 h-4 ml-2" />
            لا توجد وجبات قيد التحضير
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-1.5 max-h-[20vh] overflow-y-auto">
            {topItem && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-gradient-to-l from-primary to-primary-glow text-primary-foreground shadow-button">
                <TrendingUp className="w-3.5 h-3.5" />
                <span className="text-xs font-bold whitespace-nowrap">الأكثر طلباً</span>
                <span className="text-sm font-black whitespace-nowrap">
                  {topItem.name} ×{toEnglishNumbers(topItem.quantity.toString())}
                </span>
              </div>
            )}
            {summary.slice(1).map((item) => (
              <div
                key={item.name}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-card/70 border border-border/60 backdrop-blur-sm hover:border-primary/40 transition-colors"
              >
                <span className="text-xs font-bold text-foreground whitespace-nowrap">{item.name}</span>
                <span className="text-sm font-black text-primary whitespace-nowrap">
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

function Kpi({
  icon: Icon, label, value, tone, pulse,
}: { icon: any; label: string; value: number; tone: 'info' | 'warning' | 'destructive'; pulse?: boolean }) {
  const map = {
    info:        'bg-info/10 text-info border-info/30',
    warning:     'bg-warning/10 text-warning border-warning/40',
    destructive: 'bg-destructive/10 text-destructive border-destructive/40',
  } as const;
  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border ${map[tone]} ${pulse ? 'animate-pulse' : ''}`}>
      <Icon className="w-3.5 h-3.5" />
      <span className="text-[10px] font-bold opacity-80">{label}</span>
      <span className="text-sm font-black tabular-nums">{toEnglishNumbers(value.toString())}</span>
    </div>
  );
}
