import { useNotificationsEnforcer } from '@/hooks/useNotificationsEnforcer';
import { Button } from '@/components/ui/button';
import { Bell, BellOff, Settings, RefreshCw, ShieldAlert } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { useState } from 'react';

/**
 * Full-screen blocking overlay shown when notifications are disabled
 * at the OS level. Prevents the user from interacting with the app
 * until they re-enable notifications.
 */
export function NotificationsBlockOverlay() {
  const { blocked, channelMuted, recheck, requestPermission } = useNotificationsEnforcer();
  const [opening, setOpening] = useState(false);

  if (!Capacitor.isNativePlatform()) return null;
  if (!blocked && !channelMuted) return null;

  const openSystemSettings = async () => {
    setOpening(true);
    try {
      // Try the native bridge to open the app's notification settings page.
      // Falls back gracefully if the plugin isn't available.
      const anyCap = (window as any).Capacitor;
      if (anyCap?.Plugins?.NativeSettings?.openAndroid) {
        await anyCap.Plugins.NativeSettings.openAndroid({
          option: 'app_notification',
        });
      } else {
        // Last-resort: ask Capacitor's own permission dialog
        await requestPermission();
      }
    } catch {
      await requestPermission();
    } finally {
      setOpening(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] bg-background/95 backdrop-blur-md flex items-center justify-center p-6"
      style={{ touchAction: 'none' }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="max-w-md w-full bg-card rounded-3xl border-2 border-destructive/30 shadow-2xl p-6 space-y-5">
        <div className="flex flex-col items-center text-center gap-3">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center">
              <BellOff className="w-10 h-10 text-destructive" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-destructive flex items-center justify-center border-2 border-card">
              <ShieldAlert className="w-4 h-4 text-destructive-foreground" />
            </div>
          </div>

          <h2 className="text-xl font-bold text-destructive">
            الإشعارات معطّلة
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {blocked
              ? 'تم إيقاف الإشعارات لهذا التطبيق من إعدادات النظام. لا يمكنك استخدام التطبيق دون تفعيل الإشعارات لاستلام الطلبات والتحديثات الفورية.'
              : 'قناة "الطلبات" مكتومة من إعدادات النظام. يجب رفع أهمية القناة لتصلك التنبيهات الصوتية للطلبات.'}
          </p>
        </div>

        <div className="bg-warning/10 border border-warning/30 rounded-xl p-3 text-xs text-right space-y-1">
          <p className="font-bold text-warning-foreground">الخطوات:</p>
          <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
            <li>اضغط زر "فتح الإعدادات" أدناه</li>
            <li>فعّل خيار "إظهار الإشعارات"</li>
            <li>تأكد أن قناة "الطلبات" مفعّلة بأهمية عالية مع الصوت</li>
            <li>عُد إلى التطبيق</li>
          </ol>
        </div>

        <div className="space-y-2">
          <Button
            onClick={openSystemSettings}
            disabled={opening}
            size="lg"
            className="w-full bg-destructive hover:bg-destructive/90 text-destructive-foreground"
          >
            <Settings className="w-5 h-5 ml-2" />
            {opening ? 'جاري الفتح...' : 'فتح إعدادات الإشعارات'}
          </Button>
          <Button
            onClick={recheck}
            variant="outline"
            size="lg"
            className="w-full"
          >
            <RefreshCw className="w-5 h-5 ml-2" />
            تحقّقت، أعد الفحص
          </Button>
        </div>

        <p className="text-[11px] text-center text-muted-foreground flex items-center justify-center gap-1">
          <Bell className="w-3 h-3" />
          الإشعارات إلزامية لجميع المستخدمين
        </p>
      </div>
    </div>
  );
}