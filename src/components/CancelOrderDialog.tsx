import { useState } from 'react';
import { useCancellationReasons } from '@/contexts/CancellationReasonsContext';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { XCircle } from 'lucide-react';
import { toast } from 'sonner';

interface CancelOrderDialogProps {
  orderId: string;
  orderNumber: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCancel: (orderId: string, reason: string) => void;
}

export function CancelOrderDialog({ orderId, orderNumber, open, onOpenChange, onCancel }: CancelOrderDialogProps) {
  const { reasons } = useCancellationReasons();
  const [selectedReason, setSelectedReason] = useState<string>('');

  const handleCancel = () => {
    if (!selectedReason) {
      toast.error('يرجى اختيار سبب الإلغاء');
      return;
    }

    onCancel(orderId, selectedReason);
    toast.success('تم إلغاء الطلب');
    onOpenChange(false);
    setSelectedReason('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <XCircle className="w-5 h-5" />
            إلغاء الطلب <span className="px-1.5 py-0.5 border border-destructive/50 rounded bg-destructive/10 font-bold">{orderNumber}</span>
          </DialogTitle>
          <DialogDescription>اختر سبب الإلغاء من القائمة أدناه</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-muted-foreground">اختر سبب الإلغاء:</p>
          
          <RadioGroup
            value={selectedReason}
            onValueChange={setSelectedReason}
            className="space-y-2"
          >
            {reasons.map(reason => (
              <div
                key={reason.id}
                className="flex items-center space-x-2 space-x-reverse p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer"
              >
                <RadioGroupItem value={reason.text} id={reason.id} />
                <Label htmlFor={reason.id} className="flex-1 cursor-pointer">
                  {reason.text}
                </Label>
              </div>
            ))}
          </RadioGroup>

          <div className="flex gap-2 pt-4">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              تراجع
            </Button>
            <Button variant="destructive" className="flex-1" onClick={handleCancel}>
              <XCircle className="w-4 h-4 ml-2" />
              تأكيد الإلغاء
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
