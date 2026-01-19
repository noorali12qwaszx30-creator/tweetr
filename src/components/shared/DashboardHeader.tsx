import { LucideIcon } from 'lucide-react';

interface DashboardHeaderProps {
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  iconClassName?: string;
}

export function DashboardHeader({ title, subtitle, icon: Icon, iconClassName = 'bg-primary' }: DashboardHeaderProps) {
  return (
    <header className="bg-card border-b border-border shadow-soft sticky top-0 z-50">
      <div className="container flex items-center justify-between h-14 sm:h-16">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl ${iconClassName} flex items-center justify-center`}>
            <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-foreground text-sm sm:text-base">{title}</h1>
            {subtitle && <p className="text-[10px] sm:text-xs text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
      </div>
    </header>
  );
}
