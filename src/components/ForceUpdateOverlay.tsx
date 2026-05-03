import { Download, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Browser } from "@capacitor/browser";
import { useForceUpdateInfo } from "@/hooks/useForceUpdateCheck";

export const ForceUpdateOverlay = () => {
  const info = useForceUpdateInfo();
  if (!info) return null;

  const url = info.apkUrl ?? info.releaseUrl;

  const handleDownload = async () => {
    try {
      await Browser.open({ url });
    } catch {
      window.location.href = url;
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-primary/95 backdrop-blur-sm p-6">
      <div className="flex flex-col items-center gap-6 text-center max-w-md w-full bg-card rounded-3xl p-8 shadow-2xl">
        <div className="relative">
          <div className="absolute inset-0 animate-ping rounded-full bg-primary/30" />
          <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-primary/15">
            <Sparkles className="h-12 w-12 text-primary" />
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-foreground">يتوفر تحديث جديد إلزامي</h2>
          <p className="text-muted-foreground text-sm">
            يجب تحديث التطبيق للنسخة الأحدث للاستمرار في الاستخدام
          </p>
        </div>

        <div className="flex items-center justify-center gap-4 text-sm w-full">
          <div className="flex flex-col items-center bg-muted/50 rounded-xl px-4 py-2 flex-1">
            <span className="text-muted-foreground text-xs">نسختك</span>
            <span className="font-bold text-foreground">build-{info.currentBuild}</span>
          </div>
          <div className="flex flex-col items-center bg-primary/10 rounded-xl px-4 py-2 flex-1">
            <span className="text-primary text-xs">الجديدة</span>
            <span className="font-bold text-primary">build-{info.latestBuild}</span>
          </div>
        </div>

        {info.notes && (
          <div className="w-full max-h-32 overflow-auto bg-muted/40 rounded-xl p-3 text-xs text-right text-muted-foreground whitespace-pre-wrap">
            {info.notes}
          </div>
        )}

        <Button
          onClick={handleDownload}
          size="lg"
          className="w-full h-14 text-lg font-bold gap-2"
        >
          <Download className="h-5 w-5" />
          تحميل التحديث الآن
        </Button>

        <p className="text-xs text-muted-foreground">
          بعد التحميل، افتح الملف لتثبيت التحديث
        </p>
      </div>
    </div>
  );
};