import { Card } from '@/components/ui/card';
import { OrderTimer } from '@/components/OrderTimer';
import { OrderWithItems } from '@/hooks/useSupabaseOrders';
import { toEnglishNumbers } from '@/lib/formatNumber';

interface KitchenOrderCardProps {
  order: OrderWithItems;
}

export function KitchenOrderCard({ order }: KitchenOrderCardProps) {
  return (
    <Card className={`rounded-2xl border-2 hover:border-primary/40 hover:shadow-elevated transition-all duration-300 h-full flex flex-col overflow-hidden ${
      order.type === 'delivery' 
        ? 'bg-info/5 border-info/40' 
        : order.type === 'pickup'
        ? 'bg-accent/5 border-accent/40'
        : 'bg-success/5 border-success/40'
    }`}>
      {/* Unified top bar */}
      <div className={`flex items-center justify-between px-3 py-2 shrink-0 ${
        order.type === 'delivery' 
          ? 'bg-info/40 border-b-2 border-info' 
          : order.type === 'pickup'
          ? 'bg-accent/40 border-b-2 border-accent'
          : 'bg-success/40 border-b-2 border-success'
      }`}>
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
