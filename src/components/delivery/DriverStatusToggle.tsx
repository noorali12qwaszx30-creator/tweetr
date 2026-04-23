import { useAuth } from '@/contexts/AuthContext';
import { useDriverStatus, STATUS_LABELS, STATUS_COLORS, DriverStatusValue } from '@/hooks/useDriverStatus';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Circle, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';

const statusDotColors: Record<DriverStatusValue, string> = {
  available: 'fill-success text-success',
  busy: 'fill-warning text-warning',
  break: 'fill-info text-info',
  offline: 'fill-muted-foreground text-muted-foreground',
};

export function DriverStatusToggle() {
  const { user } = useAuth();
  const { status, updateStatus } = useDriverStatus(user?.id);

  const current: DriverStatusValue = (status?.status as DriverStatusValue) || 'available';

  const handleChange = async (newStatus: DriverStatusValue) => {
    const result = await updateStatus(newStatus);
    if (result.success) {
      toast.success(`تم تغيير حالتك إلى: ${STATUS_LABELS[newStatus]}`);
    } else {
      toast.error('فشل تحديث الحالة');
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Circle className={`w-3 h-3 ${statusDotColors[current]}`} />
          <span className="font-medium">{STATUS_LABELS[current]}</span>
          <ChevronDown className="w-3 h-3 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[180px]">
        {(Object.keys(STATUS_LABELS) as DriverStatusValue[]).map((s) => (
          <DropdownMenuItem
            key={s}
            onClick={() => handleChange(s)}
            className="gap-2 cursor-pointer"
          >
            <Circle className={`w-3 h-3 ${statusDotColors[s]}`} />
            <span>{STATUS_LABELS[s]}</span>
            {current === s && <span className="mr-auto text-xs text-primary">✓</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}