import { Wifi, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConnectionIndicatorProps {
  connected: boolean;
  className?: string;
}

export function ConnectionIndicator({ connected, className }: ConnectionIndicatorProps) {
  return (
    <div 
      className={cn(
        "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-colors",
        connected 
          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" 
          : "bg-amber-500/10 text-amber-600 dark:text-amber-400",
        className
      )}
      title={connected ? 'متصل - تحديثات مباشرة' : 'غير متصل - تحديث كل 30 ثانية'}
    >
      {connected ? (
        <>
          <Wifi className="w-3 h-3" />
          <span className="hidden sm:inline">مباشر</span>
        </>
      ) : (
        <>
          <WifiOff className="w-3 h-3" />
          <span className="hidden sm:inline">غير متصل</span>
        </>
      )}
    </div>
  );
}
