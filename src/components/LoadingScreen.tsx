import { Loader2 } from 'lucide-react';

interface LoadingScreenProps {
  message?: string;
}

export default function LoadingScreen({ message = 'جاري التحميل...' }: LoadingScreenProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4" dir="rtl">
      <div className="relative">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/30">
          <Loader2 className="w-8 h-8 text-primary-foreground animate-spin" />
        </div>
      </div>
      <p className="text-muted-foreground font-medium">{message}</p>
    </div>
  );
}
