import { useEffect, useState } from "react";
import { WifiOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export const OfflineOverlay = () => {
  const [online, setOnline] = useState(navigator.onLine);
  const [checking, setChecking] = useState(false);

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

  const retry = async () => {
    setChecking(true);
    try {
      // Try a tiny network request to verify real connectivity
      await fetch("https://www.gstatic.com/generate_204", {
        method: "GET",
        cache: "no-store",
        mode: "no-cors",
      });
      setOnline(true);
    } catch {
      setOnline(false);
    } finally {
      setChecking(false);
    }
  };

  if (online) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/95 backdrop-blur-sm">
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
            تأكد من تشغيل الواي فاي أو بيانات الجوال ثم أعد المحاولة
          </p>
        </div>
        <Button onClick={retry} disabled={checking} size="lg" className="gap-2">
          <RefreshCw className={`h-4 w-4 ${checking ? "animate-spin" : ""}`} />
          {checking ? "جاري الفحص..." : "إعادة المحاولة"}
        </Button>
      </div>
    </div>
  );
};