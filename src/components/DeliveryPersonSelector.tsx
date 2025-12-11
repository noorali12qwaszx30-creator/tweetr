import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Truck, User } from 'lucide-react';

// قائمة الدلفري المتاحين (في التطبيق الحقيقي ستأتي من قاعدة البيانات)
const DELIVERY_PERSONS = [
  { id: 'delivery-1', name: 'محمد أحمد' },
  { id: 'delivery-2', name: 'علي حسين' },
  { id: 'delivery-3', name: 'أحمد كريم' },
  { id: 'delivery-4', name: 'حسن محمود' },
  { id: 'delivery-5', name: 'عمر سالم' },
];

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
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleConfirm = () => {
    const person = DELIVERY_PERSONS.find(p => p.id === selectedId);
    if (person) {
      onSelect(person.id, person.name);
      onOpenChange(false);
      setSelectedId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-primary" />
            اختيار دلفري للطلب #{orderNumber}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-2 py-4">
          {DELIVERY_PERSONS.map((person) => (
            <button
              key={person.id}
              onClick={() => setSelectedId(person.id)}
              className={`
                w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all
                ${selectedId === person.id 
                  ? 'border-primary bg-primary/10' 
                  : 'border-border hover:border-primary/50'
                }
              `}
            >
              <div className={`
                w-10 h-10 rounded-full flex items-center justify-center
                ${selectedId === person.id ? 'bg-primary text-primary-foreground' : 'bg-muted'}
              `}>
                <User className="w-5 h-5" />
              </div>
              <span className="font-medium text-foreground">{person.name}</span>
            </button>
          ))}
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
            disabled={!selectedId}
          >
            تعيين الدلفري
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
