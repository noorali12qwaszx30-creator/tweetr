import { useEffect, useState } from 'react';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import { Device } from '@capacitor/device';
import { App as CapacitorApp } from '@capacitor/app';
import type { BackgroundGeolocationPlugin } from '@capacitor-community/background-geolocation';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const BackgroundGeolocation = registerPlugin<BackgroundGeolocationPlugin>('BackgroundGeolocation');

export type GpsState = 'ok' | 'permission_denied' | 'gps_disabled' | 'checking';

const UPDATE_INTERVAL_MS = 5_000;

// ---- Module-level singleton state ----
let currentState: GpsState = 'checking';
const listeners = new Set<(s: GpsState) => void>();
let started = false;
let currentUserId: string | null = null;
let currentUserName: string = '';
let watchId: string | null = null;
let pollInterval: number | null = null;
let lastSent = 0;
let appListenerHandle: { remove: () => void } | null = null;
let bgWatcherId: string | null = null;
let heartbeatInterval: number | null = null;
const HEARTBEAT_MS = 30_000; // كل 30 ثانية نتأكد أن التتبع شغّال

function setState(next: GpsState) {
  if (currentState === next) return;
  currentState = next;
  listeners.forEach((l) => l(next));
}

async function sendLocation(pos: {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  speed?: number | null;
  heading?: number | null;
}) {
  if (!currentUserId) return;
  try {
    let battery_level: number | null = null;
    let is_charging: boolean | null = null;
    try {
      const info = await Device.getBatteryInfo();
      battery_level = info.batteryLevel != null ? Math.round((info.batteryLevel as number) * 100) : null;
      is_charging = info.isCharging ?? null;
    } catch { /* ignore */ }

    await supabase.from('driver_locations').upsert({
      user_id: currentUserId,
      user_name: currentUserName,
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
    lastSent = Date.now();
  } catch (err) {
    console.error('[location] send failed', err);
  }
}

async function checkAndStart() {
  if (!currentUserId) return;

  // Web fallback
  if (!Capacitor.isNativePlatform()) {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setState('ok');
          sendLocation({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            speed: pos.coords.speed,
            heading: pos.coords.heading,
          });
        },
        () => setState('permission_denied'),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setState('ok');
    }
    return;
  }

  try {
    let perm = await Geolocation.checkPermissions();
    if (perm.location !== 'granted') {
      perm = await Geolocation.requestPermissions({ permissions: ['location'] });
    }
    if (perm.location !== 'granted') {
      setState('permission_denied');
      return;
    }

    try {
      const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 });
      setState('ok');
      await sendLocation({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        speed: pos.coords.speed,
        heading: pos.coords.heading,
      });
    } catch {
      setState('gps_disabled');
      return;
    }

    if (watchId) {
      try { await Geolocation.clearWatch({ id: watchId }); } catch { /* ignore */ }
      watchId = null;
    }
    watchId = await Geolocation.watchPosition(
      { enableHighAccuracy: true, timeout: 30000 },
      (pos, err) => {
        if (err || !pos) return;
        const now = Date.now();
        if (now - lastSent >= UPDATE_INTERVAL_MS) {
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

    if (pollInterval) window.clearInterval(pollInterval);
    pollInterval = window.setInterval(async () => {
      try {
        const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 8000 });
        await sendLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          speed: pos.coords.speed,
          heading: pos.coords.heading,
        });
        setState('ok');
      } catch {
        setState('gps_disabled');
      }
    }, UPDATE_INTERVAL_MS);

    // Background tracking — keeps GPS alive when app is closed/minimized
    await startBackgroundWatcher();
  } catch (err) {
    console.error('[location] start failed', err);
    setState('gps_disabled');
  }
}

async function startBackgroundWatcher() {
  if (bgWatcherId) return;
  try {
    bgWatcherId = await BackgroundGeolocation.addWatcher(
      {
        backgroundMessage: 'يتم تتبع موقعك لتسليم الطلبات',
        backgroundTitle: 'تويتر - التوصيل نشط',
        requestPermissions: true,
        stale: true,
        distanceFilter: 0,
      },
      (location, error) => {
        if (error) {
          if (error.code === 'NOT_AUTHORIZED') {
            setState('permission_denied');
          }
          return;
        }
        if (!location) return;
        const now = Date.now();
        if (now - lastSent >= UPDATE_INTERVAL_MS) {
          sendLocation({
            latitude: location.latitude,
            longitude: location.longitude,
            accuracy: location.accuracy,
            speed: location.speed,
            heading: location.bearing,
          });
        }
      }
    );
  } catch (err) {
    console.error('[location] background watcher failed', err);
    // أعد المحاولة بعد 5 ثواني
    setTimeout(() => { if (currentUserId && !bgWatcherId) startBackgroundWatcher(); }, 5000);
  }
}

/**
 * Heartbeat: يتأكد كل 30 ثانية أن الـ background watcher ما زال يعمل،
 * ويعيد تشغيله إذا أوقفه نظام Android. يطلب أيضاً موقع لحظي إذا تأخّر آخر إرسال.
 */
function startHeartbeat() {
  if (heartbeatInterval) return;
  heartbeatInterval = window.setInterval(async () => {
    if (!currentUserId) return;
    // 1) إذا الـ watcher وقع، أعد تشغيله
    if (!bgWatcherId) {
      await startBackgroundWatcher();
    }
    // 2) إذا لم يصل أي تحديث خلال 60 ثانية، اطلب موقع لحظي
    if (Date.now() - lastSent > 60_000) {
      try {
        const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 15000 });
        await sendLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          speed: pos.coords.speed,
          heading: pos.coords.heading,
        });
      } catch { /* ignore */ }
    }
  }, HEARTBEAT_MS);
}

function stopHeartbeat() {
  if (heartbeatInterval) { window.clearInterval(heartbeatInterval); heartbeatInterval = null; }
}

async function stopBackgroundWatcher() {
  if (!bgWatcherId) return;
  try {
    await BackgroundGeolocation.removeWatcher({ id: bgWatcherId });
  } catch { /* ignore */ }
  bgWatcherId = null;
}

async function stopTracking() {
  if (pollInterval) { window.clearInterval(pollInterval); pollInterval = null; }
  if (watchId) {
    try { await Geolocation.clearWatch({ id: watchId }); } catch { /* ignore */ }
    watchId = null;
  }
  stopHeartbeat();
  await stopBackgroundWatcher();
  if (appListenerHandle) { appListenerHandle.remove(); appListenerHandle = null; }
  started = false;
  currentUserId = null;
  setState('checking');
}

async function startTracking(userId: string, userName: string) {
  if (started && currentUserId === userId) return;
  if (started) await stopTracking();
  currentUserId = userId;
  currentUserName = userName;
  started = true;
  await checkAndStart();
  startHeartbeat();
  if (Capacitor.isNativePlatform()) {
    try {
      const handle = await CapacitorApp.addListener('appStateChange', (state) => {
        if (state.isActive) checkAndStart();
      });
      appListenerHandle = { remove: () => handle.remove() };
    } catch { /* ignore */ }
  }
}

export async function recheckGps() {
  await checkAndStart();
}

/**
 * Mount once at app root. Starts/stops tracking based on whether the
 * current user is a driver.
 */
export function useDriverLocationTrackerBridge() {
  const { user } = useAuth();
  useEffect(() => {
    if (user && user.role === 'delivery') {
      startTracking(user.id, user.fullName || user.username);
    } else {
      stopTracking();
    }
  }, [user?.id, user?.role]);
}

/**
 * Subscribe to current GPS state. Safe to use from multiple components.
 */
export function useGpsState(): { gpsState: GpsState; recheck: () => Promise<void> } {
  const [gpsState, setLocal] = useState<GpsState>(currentState);
  useEffect(() => {
    const fn = (s: GpsState) => setLocal(s);
    listeners.add(fn);
    setLocal(currentState);
    return () => { listeners.delete(fn); };
  }, []);
  return { gpsState, recheck: recheckGps };
}
