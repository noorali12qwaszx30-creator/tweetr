import { useGpsState } from '@/hooks/useDriverLocationTracker';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { MapPin, Settings as SettingsIcon, Loader2 } from 'lucide-react';
import { Capacitor } from '@capacitor/core';

export function GpsBlockOverlay() {
  const { user } = useAuth();
  const { gpsState, recheck } = useGpsState();

  if (!user || user.role !== 'delivery') return null;
  if (gpsState === 'ok' || gpsState === 'checking') return null;

  const openSettings = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        const mod: any = await import('capacitor-native-settings');
        await mod.NativeSettings.openAndroid({ option: mod.AndroidSettings.Location });
      } catch {
        recheck();
      }
    } else {
      recheck();
    }
  };

  const isPermissionIssue = gpsState === 'permission_denied';

  return (
    <div
      className="fixed inset-0 z-[9999] bg-primary text-primary-foreground flex items-center justify-center p-6"
      style={{ touchAction: 'none' }}
      onTouchStart={(e) => e.stopPropagation()}
    >
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-24 h-24 mx-auto bg-primary-foreground/15 rounded-full flex items-center justify-center">
          <MapPin className="w-12 h-12" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">
            {isPermissionIssue ? 'صلاحية الموقع مطلوبة' : 'يجب تفعيل GPS للعمل'}
          </h1>
          <p className="text-base opacity-90 leading-relaxed">
            {isPermissionIssue
              ? 'لا يمكنك استخدام التطبيق دون السماح بالوصول لموقعك. اضغط الزر أدناه لفتح الإعدادات.'
              : 'تطبيق السائق يحتاج GPS مفعّلاً طوال فترة العمل. افتح الإعدادات وفعّل الموقع لمتابعة العمل.'}
          </p>
        </div>
        <div className="space-y-3">
          <Button
            variant="secondary"
            size="lg"
            className="w-full bg-primary-foreground text-primary hover:bg-primary-foreground/90 font-bold"
            onClick={openSettings}
          >
            <SettingsIcon className="w-5 h-5 ml-2" />
            فتح الإعدادات
          </Button>
          <Button
            variant="ghost"
            size="lg"
            className="w-full text-primary-foreground hover:bg-primary-foreground/10"
            onClick={recheck}
          >
            <Loader2 className="w-5 h-5 ml-2" />
            إعادة الفحص
          </Button>
        </div>
        <p className="text-xs opacity-75 mt-6">
          نراقب موقعك فقط أثناء العمل لتنسيق الطلبات مع قسم الميدان.
        </p>
      </div>
    </div>
  );
}
