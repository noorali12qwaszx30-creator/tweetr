import { useEffect, useState } from "react";
import { WifiOff, Loader2 } from "lucide-react";

export const OfflineOverlay = () => {
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  if (online) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-6 px-8 text-center max-w-sm">
        <div className="relative">
          <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
          <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-primary/10">
            <WifiOff className="h-12 w-12 text-primary" />
          </div>
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-foreground">لا يوجد اتصال بالإنترنت</h2>
          <p className="text-muted-foreground">
            تأكد من تشغيل الواي فاي أو بيانات الجوال
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>جاري إعادة الاتصال تلقائياً...</span>
        </div>
      </div>
    </div>
  );
};