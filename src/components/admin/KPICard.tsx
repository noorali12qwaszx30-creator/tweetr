import { ReactNode } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend?: number; // percentage change from previous
  suffix?: string;
  variant?: 'default' | 'success' | 'warning' | 'destructive' | 'info';
}

export function KPICard({ title, value, icon, trend, suffix, variant = 'default' }: KPICardProps) {
  const variantStyles = {
    default: 'border-border',
    success: 'border-success/30 bg-success/5',
    warning: 'border-warning/30 bg-warning/5',
    destructive: 'border-destructive/30 bg-destructive/5',
    info: 'border-info/30 bg-info/5',
  };

  const iconColors = {
    default: 'text-primary',
    success: 'text-success',
    warning: 'text-warning',
    destructive: 'text-destructive',
    info: 'text-info',
  };

  const valueColors = {
    default: 'text-foreground',
    success: 'text-success',
    warning: 'text-warning',
    destructive: 'text-destructive',
    info: 'text-info',
  };

  return (
    <div className={`bg-card border rounded-xl p-4 shadow-soft ${variantStyles[variant]}`}>
      <div className="flex items-center justify-between mb-2">
        <div className={`p-2 rounded-lg bg-muted/50 ${iconColors[variant]}`}>
          {icon}
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-xs font-medium ${
            trend > 0 ? 'text-success' : trend < 0 ? 'text-destructive' : 'text-muted-foreground'
          }`}>
            {trend > 0 ? <TrendingUp className="w-3 h-3" /> : 
             trend < 0 ? <TrendingDown className="w-3 h-3" /> : 
             <Minus className="w-3 h-3" />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <p className="text-muted-foreground text-sm mb-1">{title}</p>
      <p className={`text-2xl font-bold ${valueColors[variant]}`}>
        {typeof value === 'number' ? value.toLocaleString() : value}
        {suffix && <span className="text-sm font-normal text-muted-foreground mr-1">{suffix}</span>}
      </p>
    </div>
  );
}
