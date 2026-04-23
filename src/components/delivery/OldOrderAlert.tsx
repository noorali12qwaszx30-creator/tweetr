import { useEffect, useState } from 'react';
import { OrderWithItems } from '@/hooks/useSupabaseOrders';
import { AlertTriangle, Clock } from 'lucide-react';
import { toEnglishNumbers } from '@/lib/formatNumber';

const OLD_ORDER_THRESHOLD_MINUTES = 45;

interface Props {
  orders: OrderWithItems[];
}

function minutesSince(date: string) {
  return Math.floor((Date.now() - new Date(date).getTime()) / 60000);
}

export function OldOrderAlert({ orders }: Props) {
  const [, setTick] = useState(0);

  // Re-render every 30s to keep timer fresh
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  const oldOrders = orders.filter((o) => {
    const referenceDate = o.updated_at || o.created_at;
    return minutesSince(referenceDate) >= OLD_ORDER_THRESHOLD_MINUTES;
  });

  if (oldOrders.length === 0) return null;

  return (
    <div className="bg-destructive/10 border border-destructive/30 rounded-2xl p-3 mb-3 animate-pulse">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
        <h3 className="font-bold text-destructive text-sm">
          تنبيه: لديك {toEnglishNumbers(oldOrders.length)} طلب قديم بحاجة لمتابعة!
        </h3>
      </div>
      <div className="space-y-1">
        {oldOrders.map((o) => {
          const mins = minutesSince(o.updated_at || o.created_at);
          return (
            <div key={o.id} className="flex items-center justify-between text-xs bg-card rounded-lg px-2 py-1">
              <span className="font-medium">طلب #{toEnglishNumbers(o.order_number)} - {o.customer_name}</span>
              <span className="flex items-center gap-1 text-destructive font-bold">
                <Clock className="w-3 h-3" />
                {toEnglishNumbers(mins)} دقيقة
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}