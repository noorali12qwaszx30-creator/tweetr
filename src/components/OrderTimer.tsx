import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { toEnglishNumbers } from '@/lib/formatNumber';

interface OrderTimerProps {
  startTime: Date | string;
  className?: string;
}

export function OrderTimer({ startTime, className = '' }: OrderTimerProps) {
  const [elapsed, setElapsed] = useState('00:00');

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      // Parse the start time - if it's a string, ensure it's treated as UTC
      let start: Date;
      if (typeof startTime === 'string') {
        // If the string doesn't end with Z or have timezone info, assume it's UTC
        const timeStr = startTime.endsWith('Z') || startTime.includes('+') 
          ? startTime 
          : startTime + 'Z';
        start = new Date(timeStr);
      } else {
        start = new Date(startTime);
      }
      
      const diff = Math.floor((now.getTime() - start.getTime()) / 1000);
      
      // Handle negative diff (future time) by showing 00:00
      if (diff < 0) {
        setElapsed('00:00');
        return;
      }
      
      const minutes = Math.floor(diff / 60);
      const seconds = diff % 60;
      const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      setElapsed(toEnglishNumbers(timeStr));
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
      inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-mono font-bold
      border-2 shadow-md transition-all duration-300
      ${isLate ? 'bg-destructive text-destructive-foreground border-destructive animate-pulse shadow-destructive/50' : ''}
      ${isWarning ? 'bg-warning text-warning-foreground border-warning animate-pulse shadow-warning/40' : ''}
      ${!isLate && !isWarning ? 'bg-primary/10 text-primary border-primary/30 shadow-primary/20' : ''}
      ${className}
    `}>
      <Clock className={`w-4 h-4 ${isLate || isWarning ? 'animate-spin' : ''}`} style={{ animationDuration: isLate ? '2s' : '3s' }} />
      {elapsed}
    </div>
  );
}
