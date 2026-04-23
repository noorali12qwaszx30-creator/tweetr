import { useAuth } from '@/contexts/AuthContext';
import { useDriverSosAlerts } from '@/hooks/useDriverSosAlerts';
import { SOS_TYPES } from './postTypes';
import { Button } from '@/components/ui/button';
import { Siren, CheckCircle2, ShieldCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { toast } from 'sonner';

export function SosPanel() {
  const { user } = useAuth();
  const { alerts, acknowledgeSos, resolveSos } = useDriverSosAlerts();

  if (alerts.length === 0) return null;

  const userName = user?.fullName || user?.username || 'سائق';

  return (
    <div className="bg-destructive/10 border-2 border-destructive rounded-2xl p-3 mb-3 animate-pulse">
      <div className="flex items-center gap-2 mb-2">
        <Siren className="w-5 h-5 text-destructive" />
        <h3 className="font-bold text-destructive text-sm">⚠️ تنبيهات طوارئ نشطة ({alerts.length})</h3>
      </div>
      <div className="space-y-2">
        {alerts.map((a) => {
          const meta = SOS_TYPES.find((s) => s.id === a.alert_type) || SOS_TYPES[SOS_TYPES.length - 1];
          return (
            <div key={a.id} className="bg-card rounded-xl p-3 border border-destructive/30">
              <div className="flex items-start justify-between gap-2 mb-1">
                <div>
                  <p className="font-bold text-sm">
                    {meta.emoji} {meta.label}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {a.user_name} • {formatDistanceToNow(new Date(a.created_at), { addSuffix: true, locale: ar })}
                  </p>
                </div>
                {a.status === 'acknowledged' && (
                  <span className="text-xs text-warning flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    تم الاستلام بواسطة {a.acknowledged_by_name}
                  </span>
                )}
              </div>
              {a.message && <p className="text-sm mb-2">{a.message}</p>}
              <div className="flex gap-2">
                {a.status === 'active' && a.user_id !== user?.id && (
                  <Button size="sm" variant="warning" onClick={async () => {
                    if (!user?.id) return;
                    const r = await acknowledgeSos(a.id, user.id, userName);
                    if (r.success) toast.success('تم استلام التنبيه');
                  }}>
                    أنا قادم 🏃
                  </Button>
                )}
                {(a.user_id === user?.id || a.acknowledged_by === user?.id) && (
                  <Button size="sm" variant="success" onClick={async () => {
                    const r = await resolveSos(a.id);
                    if (r.success) toast.success('تم إغلاق التنبيه');
                  }}>
                    <CheckCircle2 className="w-3 h-3 ml-1" />
                    تم الحل
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}