import React, { createContext, useContext, useState, ReactNode } from 'react';

interface CancellationReason {
  id: string;
  text: string;
}

interface CancellationReasonsContextType {
  reasons: CancellationReason[];
  addReason: (text: string) => void;
  updateReason: (id: string, text: string) => void;
  deleteReason: (id: string) => void;
}

const CancellationReasonsContext = createContext<CancellationReasonsContextType | undefined>(undefined);

// Default cancellation reasons
const DEFAULT_REASONS: CancellationReason[] = [
  { id: '1', text: 'طلب الزبون' },
  { id: '2', text: 'عدم توفر المنتج' },
  { id: '3', text: 'تأخر في التوصيل' },
  { id: '4', text: 'عنوان خاطئ' },
  { id: '5', text: 'رقم هاتف غير صحيح' },
  { id: '6', text: 'الزبون غير متواجد' },
  { id: '7', text: 'رفض الزبون الاستلام' },
  { id: '8', text: 'طلب مكرر' },
];

export function CancellationReasonsProvider({ children }: { children: ReactNode }) {
  const [reasons, setReasons] = useState<CancellationReason[]>(DEFAULT_REASONS);

  const addReason = (text: string) => {
    const newReason: CancellationReason = {
      id: `reason-${Date.now()}`,
      text,
    };
    setReasons(prev => [...prev, newReason]);
  };

  const updateReason = (id: string, text: string) => {
    setReasons(prev =>
      prev.map(reason =>
        reason.id === id ? { ...reason, text } : reason
      )
    );
  };

  const deleteReason = (id: string) => {
    setReasons(prev => prev.filter(reason => reason.id !== id));
  };

  return (
    <CancellationReasonsContext.Provider
      value={{
        reasons,
        addReason,
        updateReason,
        deleteReason,
      }}
    >
      {children}
    </CancellationReasonsContext.Provider>
  );
}

export function useCancellationReasons() {
  const context = useContext(CancellationReasonsContext);
  if (context === undefined) {
    throw new Error('useCancellationReasons must be used within a CancellationReasonsProvider');
  }
  return context;
}
