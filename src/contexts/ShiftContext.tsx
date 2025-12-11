import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface ShiftStats {
  shiftNumber: number;
  startTime: Date;
  totalOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  pendingOrders: number;
  inProgressOrders: number;
  totalRevenue: number;
  cashRevenue: number;
  onlineRevenue: number;
  totalCustomers: number;
  newCustomers: number;
  returningCustomers: number;
  avgPrepTime: number; // in minutes
  avgDeliveryTime: number; // in minutes
  fastestDelivery: number;
  slowestDelivery: number;
}

export interface ActivityLog {
  id: string;
  timestamp: Date;
  action: string;
  details: string;
  userId?: string;
  userName?: string;
  orderNumber?: number;
}

interface ShiftContextType {
  currentShift: ShiftStats;
  previousShift: ShiftStats | null;
  activityLogs: ActivityLog[];
  lastUpdated: Date;
  resetShift: () => void;
  addActivityLog: (action: string, details: string, userName?: string, orderNumber?: number) => void;
  updateShiftStats: (updates: Partial<ShiftStats>) => void;
}

const ShiftContext = createContext<ShiftContextType | undefined>(undefined);

const DEFAULT_SHIFT: ShiftStats = {
  shiftNumber: 1,
  startTime: new Date(),
  totalOrders: 0,
  completedOrders: 0,
  cancelledOrders: 0,
  pendingOrders: 0,
  inProgressOrders: 0,
  totalRevenue: 0,
  cashRevenue: 0,
  onlineRevenue: 0,
  totalCustomers: 0,
  newCustomers: 0,
  returningCustomers: 0,
  avgPrepTime: 0,
  avgDeliveryTime: 0,
  fastestDelivery: 0,
  slowestDelivery: 0,
};

export function ShiftProvider({ children }: { children: ReactNode }) {
  const [currentShift, setCurrentShift] = useState<ShiftStats>(DEFAULT_SHIFT);
  const [previousShift, setPreviousShift] = useState<ShiftStats | null>(null);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Auto-refresh every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdated(new Date());
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const resetShift = () => {
    setPreviousShift(currentShift);
    setCurrentShift({
      ...DEFAULT_SHIFT,
      shiftNumber: currentShift.shiftNumber + 1,
      startTime: new Date(),
    });
    addActivityLog('إعادة ضبط الشفت', `تم بدء شفت جديد رقم ${currentShift.shiftNumber + 1}`);
  };

  const addActivityLog = (action: string, details: string, userName?: string, orderNumber?: number) => {
    const newLog: ActivityLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date(),
      action,
      details,
      userName,
      orderNumber,
    };
    setActivityLogs(prev => [newLog, ...prev].slice(0, 100)); // Keep last 100 logs
  };

  const updateShiftStats = (updates: Partial<ShiftStats>) => {
    setCurrentShift(prev => ({ ...prev, ...updates }));
  };

  return (
    <ShiftContext.Provider
      value={{
        currentShift,
        previousShift,
        activityLogs,
        lastUpdated,
        resetShift,
        addActivityLog,
        updateShiftStats,
      }}
    >
      {children}
    </ShiftContext.Provider>
  );
}

export function useShift() {
  const context = useContext(ShiftContext);
  if (context === undefined) {
    throw new Error('useShift must be used within a ShiftProvider');
  }
  return context;
}
