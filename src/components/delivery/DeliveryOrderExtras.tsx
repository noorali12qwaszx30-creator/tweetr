import { useState } from 'react';
import { OrderWithItems } from '@/hooks/useSupabaseOrders';
import { Button } from '@/components/ui/button';
import { CustomerNotesPanel } from './CustomerNotesPanel';
import { AreaNotesPanel } from './AreaNotesPanel';
import { ChevronDown, ChevronUp, Users, MapPin } from 'lucide-react';

interface Props {
  order: OrderWithItems;
}

export function DeliveryOrderExtras({ order }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-3 pt-3 border-t border-border/50">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(!open)}
        className="w-full justify-between text-xs"
      >
        <span className="flex items-center gap-2">
          <Users className="w-3 h-3" />
          <MapPin className="w-3 h-3" />
          ملاحظات الزملاء عن الزبون والمنطقة
        </span>
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </Button>

      {open && (
        <div className="space-y-2 mt-2">
          <CustomerNotesPanel customerPhone={order.customer_phone} customerId={order.customer_id || undefined} />
          {order.delivery_area_id && (
            <AreaNotesPanel
              areaId={order.delivery_area_id}
              areaName={(order as any).delivery_area_name || 'المنطقة'}
            />
          )}
        </div>
      )}
    </div>
  );
}