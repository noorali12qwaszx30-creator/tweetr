import { useState, useEffect, useMemo } from 'react';
import { Clock } from 'lucide-react';
import { toEnglishNumbers } from '@/lib/formatNumber';

interface OrderTimerProps {
  startTime: Date | string;
  className?: string;
}

export function OrderTimer({ startTime, className = '' }: OrderTimerProps) {
  const [elapsed, setElapsed] = useState('00:00');

  // Parse the start time once and memoize it
  const parsedStartTime = useMemo(() => {
    if (!startTime) return new Date();
    
    // If it's already a Date object
    if (startTime instanceof Date) {
      return startTime;
    }
    
    // Parse the ISO string from the database
    const date = new Date(startTime);
    
    // Check if the date is valid
    if (isNaN(date.getTime())) {
      console.warn('Invalid startTime:', startTime);
      return new Date();
    }
    
    return date;
  }, [startTime]);

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      // Calculate difference in seconds
      const diffMs = now.getTime() - parsedStartTime.getTime();
      
      // Ensure we don't show negative time
      const diff = Math.max(0, Math.floor(diffMs / 1000));
      
      const minutes = Math.floor(diff / 60);
      const seconds = diff % 60;
      const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      setElapsed(toEnglishNumbers(timeStr));
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [parsedStartTime]);

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
