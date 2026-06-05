import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Truck, User, Loader2, Check, X } from 'lucide-react';
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

  const handleClose = (open: boolean) => {
    if (!open) setSelectedId(null);
    onOpenChange(open);
  };

  const handleConfirm = (id: string, name: string) => {
    onSelect(id, name);
    setSelectedId(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-4 pb-3 border-b border-border shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-primary" />
            اختيار دلفري للطلب <span className="text-primary px-1.5 py-0.5 border border-primary/30 rounded bg-primary/5 font-bold">{orderNumber}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 min-h-0">
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
            drivers.map((driver) => {
              const isSelected = selectedId === driver.user_id;
              return (
                <div key={driver.user_id} className="space-y-2">
                  <button
                    onClick={() => setSelectedId(isSelected ? null : driver.user_id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                      isSelected
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50 hover:bg-primary/5'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    }`}>
                      <User className="w-5 h-5" />
                    </div>
                    <div className="text-right flex-1 min-w-0">
                      <span className="font-medium text-foreground block truncate">{driver.full_name}</span>
                      {driver.phone && (
                        <span className="text-xs text-muted-foreground">{driver.phone}</span>
                      )}
                    </div>
                  </button>
                  {isSelected && (
                    <div className="flex gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
                      <Button
                        onClick={() => handleConfirm(driver.user_id, driver.full_name)}
                        className="flex-1 gap-1"
                      >
                        <Check className="w-4 h-4" />
                        تأكيد
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setSelectedId(null)}
                        className="flex-1 gap-1"
                      >
                        <X className="w-4 h-4" />
                        إلغاء
                      </Button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="p-3 border-t border-border shrink-0 bg-background">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => handleClose(false)}
          >
            إلغاء
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
