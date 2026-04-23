import { LucideIcon } from 'lucide-react';
import { ConnectionIndicator } from './ConnectionIndicator';

interface DashboardHeaderProps {
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  iconClassName?: string;
  realtimeConnected?: boolean;
  showConnectionIndicator?: boolean;
}

export function DashboardHeader({ 
  title, 
  subtitle, 
  icon: Icon, 
  iconClassName = 'bg-primary',
  realtimeConnected = true,
  showConnectionIndicator = false
}: DashboardHeaderProps) {
  return (
    <header className="bg-background/80 backdrop-blur-xl sticky top-0 z-50 border-b border-border/40">
      <div className="container flex items-center justify-between h-16 sm:h-20">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl ${iconClassName} flex items-center justify-center shadow-button`}>
            <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-bold text-foreground text-base sm:text-lg leading-tight">{title}</h1>
            {subtitle && <p className="text-xs sm:text-sm text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
        {showConnectionIndicator && (
          <ConnectionIndicator connected={realtimeConnected} />
        )}
      </div>
    </header>
  );
}
