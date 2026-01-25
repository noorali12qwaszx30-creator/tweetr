import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { ActivityLog } from '@/contexts/ActivityLogContext';
import { 
  Activity, 
  UserPlus, 
  Edit, 
  XCircle, 
  Truck, 
  RefreshCcw, 
  LogIn, 
  LogOut,
  Printer,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';

interface ActivityLogListProps {
  logs: ActivityLog[];
}

export function ActivityLogList({ logs }: ActivityLogListProps) {
  const getActivityIcon = (action: string) => {
    if (action.includes('إلغاء')) return <XCircle className="w-4 h-4 text-destructive" />;
    if (action.includes('تعديل')) return <Edit className="w-4 h-4 text-warning" />;
    if (action.includes('إضافة') || action.includes('جديد')) return <UserPlus className="w-4 h-4 text-success" />;
    if (action.includes('سائق') || action.includes('توصيل')) return <Truck className="w-4 h-4 text-info" />;
    if (action.includes('شفت') || action.includes('ضبط')) return <RefreshCcw className="w-4 h-4 text-primary" />;
    if (action.includes('دخول')) return <LogIn className="w-4 h-4 text-success" />;
    if (action.includes('خروج')) return <LogOut className="w-4 h-4 text-muted-foreground" />;
    if (action.includes('طباعة')) return <Printer className="w-4 h-4 text-info" />;
    if (action.includes('اكتمل') || action.includes('تسليم')) return <CheckCircle className="w-4 h-4 text-success" />;
    if (action.includes('تأخير') || action.includes('تنبيه')) return <AlertTriangle className="w-4 h-4 text-warning" />;
    return <Activity className="w-4 h-4 text-muted-foreground" />;
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4 shadow-soft">
      <h3 className="font-bold mb-4 flex items-center gap-2">
        <Activity className="w-5 h-5 text-primary" />
        سجل النشاطات
      </h3>

      {logs.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>لا توجد نشاطات مسجلة</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {logs.map(log => (
            <div 
              key={log.id} 
              className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="mt-1">
                {getActivityIcon(log.action)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-foreground">{log.action}</span>
                  {log.orderNumber && (
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-lg border border-primary/30 font-bold">
                      {log.orderNumber}
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground truncate">{log.details}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                  <span>{format(new Date(log.timestamp), 'hh:mm:ss a', { locale: ar })}</span>
                  {log.userName && (
                    <>
                      <span>•</span>
                      <span>{log.userName}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
