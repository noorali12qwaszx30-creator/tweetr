import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Truck, User, Loader2 } from 'lucide-react';
import { useDeliveryDrivers } from '@/hooks/useDeliveryDrivers';

interface DeliveryPersonSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (deliveryPersonId: string, deliveryPersonName: string) => void;
  orderNumber: number;
}

export function DeliveryPersonSelector({
  open,
  onOpenChange,
  onSelect,
  orderNumber,
}: DeliveryPersonSelectorProps) {
  const { drivers, loading } = useDeliveryDrivers();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleConfirm = () => {
    const driver = drivers.find(d => d.user_id === selectedId);
    if (driver) {
      onSelect(driver.user_id, driver.full_name);
      onOpenChange(false);
      setSelectedId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-primary" />
            اختيار دلفري للطلب #{orderNumber}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-2 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : drivers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <User className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">لا يوجد دلفرية مضافين</p>
              <p className="text-xs mt-1">يرجى إضافة دلفري من لوحة المدير</p>
            </div>
          ) : (
            drivers.map((driver) => (
              <button
                key={driver.user_id}
                onClick={() => setSelectedId(driver.user_id)}
                className={`
                  w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all
                  ${selectedId === driver.user_id 
                    ? 'border-primary bg-primary/10' 
                    : 'border-border hover:border-primary/50'
                  }
                `}
              >
                <div className={`
                  w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0
                  ${selectedId === driver.user_id ? 'bg-primary text-primary-foreground' : 'bg-muted'}
                `}>
                  <User className="w-5 h-5" />
                </div>
                <div className="text-right flex-1 min-w-0">
                  <span className="font-medium text-foreground block truncate">{driver.full_name}</span>
                  {driver.phone && (
                    <span className="text-xs text-muted-foreground">{driver.phone}</span>
                  )}
                </div>
              </button>
            ))
          )}
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
          >
            إلغاء
          </Button>
          <Button
            className="flex-1"
            onClick={handleConfirm}
            disabled={!selectedId || drivers.length === 0}
          >
            تعيين الدلفري
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
