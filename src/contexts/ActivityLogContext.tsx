import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface ActivityLog {
  id: string;
  timestamp: Date;
  action: string;
  details: string;
  userId?: string;
  userName?: string;
  orderNumber?: number;
}

interface ActivityLogContextType {
  activityLogs: ActivityLog[];
  addActivityLog: (action: string, details: string, userName?: string, orderNumber?: number) => void;
}

const ActivityLogContext = createContext<ActivityLogContextType | undefined>(undefined);

export function ActivityLogProvider({ children }: { children: ReactNode }) {
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);

  const addActivityLog = (action: string, details: string, userName?: string, orderNumber?: number) => {
    const newLog: ActivityLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date(),
      action,
      details,
      userName,
      orderNumber,
    };
    setActivityLogs(prev => [newLog, ...prev].slice(0, 100));
  };

  return (
    <ActivityLogContext.Provider value={{ activityLogs, addActivityLog }}>
      {children}
    </ActivityLogContext.Provider>
  );
}

export function useActivityLog() {
  const context = useContext(ActivityLogContext);
  if (context === undefined) {
    throw new Error('useActivityLog must be used within an ActivityLogProvider');
  }
  return context;
}
