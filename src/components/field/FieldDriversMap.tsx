import { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useDriverLocations, getStaleness, DriverLocation } from '@/hooks/useDriverLocations';
import { Card } from '@/components/ui/card';
import { Battery, BatteryCharging, Phone, MessageCircle, MapPin, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Default Tripoli, Libya (orange brand). Adjust if needed.
const DEFAULT_CENTER: [number, number] = [32.8872, 13.1913];

function makeIcon(color: string) {
  return L.divIcon({
    className: 'driver-marker',
    html: `<div style="width:28px;height:28px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;color:white;font-size:14px;font-weight:bold;">●</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

const ICONS = {
  live: makeIcon('#22c55e'),
  recent: makeIcon('#eab308'),
  stale: makeIcon('#ef4444'),
};

function FitBounds({ locations }: { locations: DriverLocation[] }) {
  const map = useMap();
  if (locations.length > 0) {
    const bounds = L.latLngBounds(locations.map((l) => [l.latitude, l.longitude] as [number, number]));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
  }
  return null;
}

function timeAgo(iso: string) {
  const sec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (sec < 60) return `قبل ${sec} ثانية`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `قبل ${min} دقيقة`;
  const hr = Math.floor(min / 60);
  return `قبل ${hr} ساعة`;
}

export function FieldDriversMap() {
  const { locations, loading } = useDriverLocations();

  const stats = useMemo(() => {
    const live = locations.filter((l) => getStaleness(l.updated_at) === 'live').length;
    const recent = locations.filter((l) => getStaleness(l.updated_at) === 'recent').length;
    const stale = locations.filter((l) => getStaleness(l.updated_at) === 'stale').length;
    return { live, recent, stale };
  }, [locations]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <Card className="p-3 text-center">
          <div className="text-2xl font-bold text-success">{stats.live}</div>
          <div className="text-xs text-muted-foreground">نشط الآن</div>
        </Card>
        <Card className="p-3 text-center">
          <div className="text-2xl font-bold text-warning">{stats.recent}</div>
          <div className="text-xs text-muted-foreground">حديث</div>
        </Card>
        <Card className="p-3 text-center">
          <div className="text-2xl font-bold text-destructive">{stats.stale}</div>
          <div className="text-xs text-muted-foreground">خامل</div>
        </Card>
      </div>

      <div className="rounded-xl overflow-hidden border border-border" style={{ height: '60vh', minHeight: 400 }}>
        <MapContainer center={DEFAULT_CENTER} zoom={12} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; OpenStreetMap'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitBounds locations={locations} />
          {locations.map((loc) => {
            const status = getStaleness(loc.updated_at);
            return (
              <Marker key={loc.id} position={[loc.latitude, loc.longitude]} icon={ICONS[status]}>
                <Popup>
                  <div className="space-y-2 min-w-[200px]" dir="rtl">
                    <div className="font-bold text-base">{loc.user_name}</div>
                    <div className="text-xs text-muted-foreground">{timeAgo(loc.updated_at)}</div>
                    <div className="flex items-center gap-2 text-xs">
                      {loc.is_charging ? (
                        <BatteryCharging className="w-4 h-4 text-success" />
                      ) : (
                        <Battery className="w-4 h-4" />
                      )}
                      <span>{loc.battery_level ?? '?'}%</span>
                      {loc.speed != null && loc.speed > 0 && (
                        <span className="ml-auto">{Math.round((loc.speed * 3.6))} كم/س</span>
                      )}
                    </div>
                    {loc.accuracy != null && (
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <MapPin className="w-3 h-3" />
                        دقة ±{Math.round(loc.accuracy)}م
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-bold">قائمة السائقين ({locations.length})</h3>
        {locations.length === 0 && (
          <Card className="p-6 text-center text-muted-foreground">
            <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>لا يوجد سائقون يشاركون مواقعهم حالياً</p>
          </Card>
        )}
        {locations.map((loc) => {
          const status = getStaleness(loc.updated_at);
          const colorMap = { live: 'text-success', recent: 'text-warning', stale: 'text-destructive' } as const;
          const dotMap = { live: 'bg-success', recent: 'bg-warning', stale: 'bg-destructive' } as const;
          return (
            <Card key={loc.id} className="p-3 flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${dotMap[status]} animate-pulse`} />
              <div className="flex-1 min-w-0">
                <div className="font-bold truncate">{loc.user_name}</div>
                <div className={`text-xs ${colorMap[status]}`}>{timeAgo(loc.updated_at)}</div>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                {loc.is_charging ? <BatteryCharging className="w-4 h-4" /> : <Battery className="w-4 h-4" />}
                {loc.battery_level ?? '?'}%
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.open(`https://www.google.com/maps?q=${loc.latitude},${loc.longitude}`, '_blank')}
              >
                <MapPin className="w-3 h-3" />
              </Button>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
