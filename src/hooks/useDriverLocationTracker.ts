import { useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import { Device } from '@capacitor/device';
import { App as CapacitorApp } from '@capacitor/app';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

type GpsState = 'ok' | 'permission_denied' | 'gps_disabled' | 'checking';

const UPDATE_INTERVAL_MS = 10_000;

export function useDriverLocationTracker(): { gpsState: GpsState; recheck: () => Promise<void> } {
  const { user } = useAuth();
  const [gpsState, setGpsState] = useState<GpsState>('checking');
  const watchIdRef = useRef<string | null>(null);
  const intervalRef = useRef<number | null>(null);
  const lastSentRef = useRef<number>(0);

  const isDriver = user?.role === 'delivery';

  const sendLocation = async (pos: { latitude: number; longitude: number; accuracy?: number | null; speed?: number | null; heading?: number | null }) => {
    if (!user || !isDriver) return;
    try {
      let battery_level: number | null = null;
      let is_charging: boolean | null = null;
      try {
        const info = await Device.getBatteryInfo();
        battery_level = info.batteryLevel != null ? Math.round((info.batteryLevel as number) * 100) : null;
        is_charging = info.isCharging ?? null;
      } catch { /* ignore */ }

      await supabase.from('driver_locations').upsert({
        user_id: user.id,
        user_name: user.fullName || user.username,
        latitude: pos.latitude,
        longitude: pos.longitude,
        accuracy: pos.accuracy ?? null,
        speed: pos.speed ?? null,
        heading: pos.heading ?? null,
        battery_level,
        is_charging,
        is_gps_enabled: true,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
      lastSentRef.current = Date.now();
    } catch (err) {
      console.error('[location] send failed', err);
    }
  };

  const checkAndStart = async () => {
    if (!isDriver) {
      setGpsState('ok');
      return;
    }
    if (!Capacitor.isNativePlatform()) {
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setGpsState('ok');
            sendLocation({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
              speed: pos.coords.speed,
              heading: pos.coords.heading,
            });
          },
          () => setGpsState('permission_denied')
        );
      } else {
        setGpsState('ok');
      }
      return;
    }

    try {
      let perm = await Geolocation.checkPermissions();
      if (perm.location !== 'granted') {
        perm = await Geolocation.requestPermissions({ permissions: ['location'] });
      }
      if (perm.location !== 'granted') {
        setGpsState('permission_denied');
        return;
      }

      try {
        const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 });
        setGpsState('ok');
        await sendLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          speed: pos.coords.speed,
          heading: pos.coords.heading,
        });
      } catch {
        setGpsState('gps_disabled');
        return;
      }

      if (watchIdRef.current) {
        await Geolocation.clearWatch({ id: watchIdRef.current });
        watchIdRef.current = null;
      }
      const id = await Geolocation.watchPosition(
        { enableHighAccuracy: true, timeout: 30000 },
        (pos, err) => {
          if (err || !pos) return;
          const now = Date.now();
          if (now - lastSentRef.current >= UPDATE_INTERVAL_MS) {
            sendLocation({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
              speed: pos.coords.speed,
              heading: pos.coords.heading,
            });
          }
        }
      );
      watchIdRef.current = id;

      if (intervalRef.current) window.clearInterval(intervalRef.current);
      intervalRef.current = window.setInterval(async () => {
        try {
          const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 8000 });
          await sendLocation({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            speed: pos.coords.speed,
            heading: pos.coords.heading,
          });
          setGpsState((s) => (s === 'ok' ? s : 'ok'));
        } catch {
          setGpsState('gps_disabled');
        }
      }, UPDATE_INTERVAL_MS);
    } catch (err) {
      console.error('[location] start failed', err);
      setGpsState('gps_disabled');
    }
  };

  useEffect(() => {
    if (!isDriver || !user) return;
    checkAndStart();

    let removeAppListener: (() => void) | null = null;
    CapacitorApp.addListener('appStateChange', (state) => {
      if (state.isActive) checkAndStart();
    }).then((handle) => {
      removeAppListener = () => handle.remove();
    }).catch(() => {});

    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      if (watchIdRef.current) Geolocation.clearWatch({ id: watchIdRef.current }).catch(() => {});
      removeAppListener?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, isDriver]);

  return { gpsState, recheck: checkAndStart };
}
