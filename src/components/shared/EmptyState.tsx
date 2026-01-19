import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  message: string;
  className?: string;
}

export function EmptyState({ icon: Icon, message, className = '' }: EmptyStateProps) {
  return (
    <div className={`text-center py-8 sm:py-12 text-muted-foreground ${className}`}>
      <Icon className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-4 opacity-50" />
      <p>{message}</p>
    </div>
  );
}
