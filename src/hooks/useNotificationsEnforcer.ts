import { useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
import { App as CapacitorApp } from '@capacitor/app';

/**
 * Continuously checks whether notifications are enabled at the OS level.
 * If the user disables them from system settings, the app surfaces a
 * blocking overlay (handled in the consumer component) until the user
 * re-enables them.
 *
 * Returns true when notifications ARE blocked / disabled.
 */
export function useNotificationsEnforcer(): {
  blocked: boolean;
  channelMuted: boolean;
  recheck: () => Promise<void>;
  requestPermission: () => Promise<void>;
} {
  const [blocked, setBlocked] = useState(false);
  const [channelMuted, setChannelMuted] = useState(false);
  const intervalRef = useRef<number | null>(null);

  const check = async () => {
    if (!Capacitor.isNativePlatform()) {
      setBlocked(false);
      setChannelMuted(false);
      return;
    }
    try {
      const perm = await PushNotifications.checkPermissions();
      const localPerm = await LocalNotifications.checkPermissions();
      const granted =
        perm.receive === 'granted' && localPerm.display === 'granted';
      setBlocked(!granted);

      // Check the "orders" channel importance — if user muted it,
      // importance becomes 0 (NONE) or 1 (MIN, no sound).
      try {
        const { channels } = await LocalNotifications.listChannels();
        const orders = channels?.find((c: any) => c.id === 'orders');
        if (orders) {
          const importance = (orders as any).importance ?? 5;
          // 5 = HIGH, 4 = DEFAULT, 3 = LOW, 2 = MIN, 1/0 = NONE
          setChannelMuted(importance < 3);
        } else {
          setChannelMuted(false);
        }
      } catch {
        setChannelMuted(false);
      }
    } catch {
      // If anything fails, assume blocked so the user is forced to fix it.
      setBlocked(true);
    }
  };

  const requestPermission = async () => {
    if (!Capacitor.isNativePlatform()) return;
    try {
      await PushNotifications.requestPermissions();
      await LocalNotifications.requestPermissions();
    } catch {
      // ignore
    }
    await check();
  };

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    check();

    // Re-check every 4 seconds while the app is open.
    intervalRef.current = window.setInterval(check, 4000);

    // Re-check immediately when the app returns to the foreground (e.g.
    // after the user came back from the system settings screen).
    let removeAppListener: (() => void) | null = null;
    CapacitorApp.addListener('appStateChange', (state) => {
      if (state.isActive) check();
    }).then((handle) => {
      removeAppListener = () => handle.remove();
    });

    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      removeAppListener?.();
    };
  }, []);

  return { blocked, channelMuted, recheck: check, requestPermission };
}