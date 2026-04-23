import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useDriverSosAlerts } from '@/hooks/useDriverSosAlerts';
import { SOS_TYPES } from './postTypes';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Siren, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function SosButton() {
  const { user } = useAuth();
  const { createSos } = useDriverSosAlerts();
  const [open, setOpen] = useState(false);
  const [alertType, setAlertType] = useState<string>('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSend = async () => {
    if (!alertType) {
      toast.error('اختر نوع الحالة');
      return;
    }
    if (!user?.id) return;
    setSubmitting(true);
    const r = await createSos({
      user_id: user.id,
      user_name: user.fullName || user.username || 'سائق',
      alert_type: alertType,
      message: message.trim() || undefined,
    });
    setSubmitting(false);
    if (r.success) {
      toast.success('🚨 تم إرسال طلب الطوارئ! المدير والميدان سيتواصلون معك');
      setOpen(false);
      setAlertType('');
      setMessage('');
    } else {
      toast.error('فشل إرسال طلب الطوارئ');
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 bg-destructive text-destructive-foreground px-4 py-2 rounded-full font-bold shadow-floating hover:scale-105 transition-all animate-pulse"
      >
        <Siren className="w-5 h-5" />
        طوارئ SOS
      </button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Siren className="w-6 h-6" />
              طلب طوارئ
            </AlertDialogTitle>
            <AlertDialogDescription>
              سيتم إرسال تنبيه فوري للمدير والميدان وكافة السائقين.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-3">
            <div>
              <p className="text-sm font-bold mb-2">نوع الحالة:</p>
              <div className="grid grid-cols-2 gap-2">
                {SOS_TYPES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setAlertType(s.id)}
                    className={`flex items-center gap-2 p-2 rounded-xl border-2 transition-all ${
                      alertType === s.id ? 'border-destructive bg-destructive/10' : 'border-border bg-card'
                    }`}
                  >
                    <span className="text-xl">{s.emoji}</span>
                    <span className="text-xs font-bold">{s.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-bold mb-2">رسالة (اختياري):</p>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="اشرح حالتك بإيجاز..."
                rows={2}
                maxLength={200}
              />
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>إلغاء</AlertDialogCancel>
            <Button variant="destructive" onClick={handleSend} disabled={submitting}>
              {submitting ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Siren className="w-4 h-4 ml-2" />}
              إرسال طلب الطوارئ
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}