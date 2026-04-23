import { useDriverStatus, STATUS_LABELS, DriverStatusValue } from '@/hooks/useDriverStatus';
import { useDeliveryDrivers } from '@/hooks/useDeliveryDrivers';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Circle, Users, Phone, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const statusDotColors: Record<DriverStatusValue, string> = {
  available: 'fill-success text-success',
  busy: 'fill-warning text-warning',
  break: 'fill-info text-info',
  offline: 'fill-muted-foreground text-muted-foreground',
};

const statusBadgeColors: Record<DriverStatusValue, string> = {
  available: 'bg-success/15 text-success border-success/30',
  busy: 'bg-warning/15 text-warning border-warning/30',
  break: 'bg-info/15 text-info border-info/30',
  offline: 'bg-muted text-muted-foreground border-border',
};

export function DriverStatusMonitor() {
  const { drivers, loading: driversLoading } = useDeliveryDrivers();
  const { allStatuses, loading: statusLoading } = useDriverStatus();

  if (driversLoading || statusLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const driverWithStatus = drivers.map((d) => {
    const s = allStatuses.find((st) => st.user_id === d.user_id);
    return {
      ...d,
      status: (s?.status as DriverStatusValue) || 'offline',
      status_message: s?.status_message,
      updated_at: s?.updated_at,
    };
  });

  const counts = {
    available: driverWithStatus.filter((d) => d.status === 'available').length,
    busy: driverWithStatus.filter((d) => d.status === 'busy').length,
    break: driverWithStatus.filter((d) => d.status === 'break').length,
    offline: driverWithStatus.filter((d) => d.status === 'offline').length,
  };

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {(Object.keys(counts) as DriverStatusValue[]).map((s) => (
          <Card key={s} className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <Circle className={`w-3 h-3 ${statusDotColors[s]}`} />
              <span className="text-xs text-muted-foreground">{STATUS_LABELS[s]}</span>
            </div>
            <p className="text-2xl font-bold">{counts[s]}</p>
          </Card>
        ))}
      </div>

      {/* Drivers list */}
      <div className="space-y-2">
        <h3 className="text-sm font-bold flex items-center gap-2 text-muted-foreground">
          <Users className="w-4 h-4" />
          السائقون ({driverWithStatus.length})
        </h3>
        {driverWithStatus.length === 0 ? (
          <Card className="p-6 text-center text-muted-foreground">
            <p>لا يوجد سائقون مسجلون</p>
          </Card>
        ) : (
          driverWithStatus.map((d) => (
            <Card key={d.id} className="p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Circle className={`w-4 h-4 shrink-0 ${statusDotColors[d.status]}`} />
                  <div className="min-w-0 flex-1">
                    <p className="font-bold truncate">{d.full_name}</p>
                    {d.status_message && (
                      <p className="text-xs text-muted-foreground truncate">{d.status_message}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="outline" className={`text-xs ${statusBadgeColors[d.status]}`}>
                    {STATUS_LABELS[d.status]}
                  </Badge>
                  {d.phone && (
                    <Button asChild variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <a href={`tel:${d.phone}`}>
                        <Phone className="w-4 h-4" />
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}