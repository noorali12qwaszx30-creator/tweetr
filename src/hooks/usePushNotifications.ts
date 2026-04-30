import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

/**
 * Registers the device for FCM push notifications and stores the
 * resulting device token in the database, scoped to the current user
 * and role. Only runs on native platforms (Android/iOS).
 */
export function usePushNotifications() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return;
    if (!Capacitor.isNativePlatform()) return;

    let registrationListener: any;
    let errorListener: any;
    let receivedListener: any;
    let actionListener: any;

    const setup = async () => {
      try {
        // Request permission
        let perm = await PushNotifications.checkPermissions();
        if (perm.receive === 'prompt' || perm.receive === 'prompt-with-rationale') {
          perm = await PushNotifications.requestPermissions();
        }
        if (perm.receive !== 'granted') return;

        // Local notifications permission (used as fallback when app is in foreground)
        try {
          await LocalNotifications.requestPermissions();
          await LocalNotifications.createChannel({
            id: 'orders',
            name: 'الطلبات',
            description: 'تنبيهات الطلبات الجديدة وتغيير الحالات',
            importance: 5,
            visibility: 1,
            sound: 'default',
            vibration: true,
            lights: true,
            lightColor: '#F97316',
          });
        } catch {
          // ignore
        }

        // Save token on registration
        registrationListener = await PushNotifications.addListener('registration', async (token) => {
          try {
            await supabase.from('device_tokens').upsert(
              {
                user_id: user.id,
                device_token: token.value,
                platform: Capacitor.getPlatform(),
                role: (user.role ?? null) as any,
                last_active_at: new Date().toISOString(),
              },
              { onConflict: 'device_token' }
            );
          } catch {
            // ignore – will retry next launch
          }
        });

        errorListener = await PushNotifications.addListener('registrationError', () => {
          // silent fail
        });

        // When a push is received with the app in the foreground,
        // surface it as a local notification so the user sees a banner.
        receivedListener = await PushNotifications.addListener(
          'pushNotificationReceived',
          async (notification) => {
            try {
              await LocalNotifications.schedule({
                notifications: [
                  {
                    id: Math.floor(Date.now() % 2147483647),
                    title: notification.title || 'طلب جديد',
                    body: notification.body || '',
                    channelId: 'orders',
                    sound: 'default',
                    smallIcon: 'ic_stat_icon',
                  },
                ],
              });
            } catch {
              // ignore
            }
          }
        );

        // When the user taps the notification
        actionListener = await PushNotifications.addListener(
          'pushNotificationActionPerformed',
          () => {
            // No-op for now; navigation handled inside the app shell.
          }
        );

        await PushNotifications.register();
      } catch {
        // ignore – non-fatal
      }
    };

    setup();

    return () => {
      registrationListener?.remove?.();
      errorListener?.remove?.();
      receivedListener?.remove?.();
      actionListener?.remove?.();
    };
  }, [user?.id, user?.role]);
}