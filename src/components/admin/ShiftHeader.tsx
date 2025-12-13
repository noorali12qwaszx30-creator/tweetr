import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { RefreshCcw, Clock, Hash, Building2, Calendar, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface ShiftHeaderProps {
  restaurantName: string;
  branchName?: string;
  shiftNumber: number;
  shiftStartTime: Date;
  lastUpdated: Date;
  onReset: () => void;
  onRefresh: () => void;
}

export function ShiftHeader({
  restaurantName,
  branchName,
  shiftNumber,
  shiftStartTime,
  lastUpdated,
  onReset,
  onRefresh,
}: ShiftHeaderProps) {
  const handleFullReset = () => {
    // Clear all localStorage data
    localStorage.clear();
    // Call the original reset function
    onReset();
    // Reload the page to start fresh
    window.location.reload();
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4 shadow-soft mb-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Restaurant Info */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
            <Building2 className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">{restaurantName}</h1>
            {branchName && (
              <p className="text-sm text-muted-foreground">{branchName}</p>
            )}
          </div>
        </div>

        {/* Shift Info */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-primary/10 text-primary px-3 py-2 rounded-lg">
            <Hash className="w-4 h-4" />
            <span className="font-semibold">شفت {shiftNumber}</span>
          </div>
          
          <div className="flex items-center gap-2 bg-muted px-3 py-2 rounded-lg">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">
              بدأ: {format(shiftStartTime, 'HH:mm', { locale: ar })}
            </span>
          </div>
          
          <div className="flex items-center gap-2 bg-muted px-3 py-2 rounded-lg">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">
              {format(shiftStartTime, 'yyyy/MM/dd', { locale: ar })}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <div className="text-xs text-muted-foreground ml-2">
            آخر تحديث: {format(lastUpdated, 'HH:mm:ss', { locale: ar })}
          </div>
          <Button variant="outline" size="sm" onClick={onRefresh}>
            <RefreshCcw className="w-4 h-4" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="w-4 h-4 ml-1" />
                إعادة ضبط الشفت
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>إعادة ضبط الشفت</AlertDialogTitle>
                <AlertDialogDescription>
                  سيتم مسح جميع بيانات التطبيق المحلية والعودة للصفر. البيانات المحفوظة في قاعدة البيانات ستبقى كما هي.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                <AlertDialogAction onClick={handleFullReset} className="bg-destructive hover:bg-destructive/90">
                  تأكيد إعادة الضبط
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}
