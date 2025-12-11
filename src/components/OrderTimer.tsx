import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface OrderTimerProps {
  startTime: Date;
  className?: string;
}

export function OrderTimer({ startTime, className = '' }: OrderTimerProps) {
  const [elapsed, setElapsed] = useState('00:00');

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const diff = Math.floor((now.getTime() - new Date(startTime).getTime()) / 1000);
      const minutes = Math.floor(diff / 60);
      const seconds = diff % 60;
      setElapsed(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  const minutes = parseInt(elapsed.split(':')[0]);
  const isLate = minutes >= 30;
  const isWarning = minutes >= 20 && minutes < 30;

  return (
    <div className={`
      inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-sm font-mono font-semibold
      ${isLate ? 'bg-destructive/10 text-destructive' : ''}
      ${isWarning ? 'bg-warning/10 text-warning' : ''}
      ${!isLate && !isWarning ? 'bg-muted text-muted-foreground' : ''}
      ${className}
    `}>
      <Clock className="w-3.5 h-3.5" />
      {elapsed}
    </div>
  );
}
