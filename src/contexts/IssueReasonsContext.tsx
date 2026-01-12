import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface IssueReason {
  id: string;
  label: string;
}

interface IssueReasonsContextType {
  reasons: IssueReason[];
  addReason: (label: string) => void;
  updateReason: (id: string, label: string) => void;
  removeReason: (id: string) => void;
}

const defaultReasons: IssueReason[] = [
  { id: '1', label: 'نقص في الطلب' },
  { id: '2', label: 'صنف غير متوفر' },
  { id: '3', label: 'خطأ في الطلب' },
  { id: '4', label: 'طلب بارد/غير طازج' },
  { id: '5', label: 'تغليف غير صحيح' },
  { id: '6', label: 'عنوان غير واضح' },
  { id: '7', label: 'الزبون غير راضٍ' },
  { id: '8', label: 'أخرى' },
];

const STORAGE_KEY = 'issue_reasons';

function loadReasonsFromStorage(): IssueReason[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error loading issue reasons from storage:', error);
  }
  return defaultReasons;
}

function saveReasonsToStorage(reasons: IssueReason[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reasons));
  } catch (error) {
    console.error('Error saving issue reasons to storage:', error);
  }
}

const IssueReasonsContext = createContext<IssueReasonsContextType | undefined>(undefined);

export function IssueReasonsProvider({ children }: { children: ReactNode }) {
  const [reasons, setReasons] = useState<IssueReason[]>(() => loadReasonsFromStorage());

  const addReason = (label: string) => {
    const newReason: IssueReason = {
      id: Date.now().toString(),
      label,
    };
    const updatedReasons = [...reasons, newReason];
    setReasons(updatedReasons);
    saveReasonsToStorage(updatedReasons);
  };

  const updateReason = (id: string, label: string) => {
    const updatedReasons = reasons.map(r => 
      r.id === id ? { ...r, label } : r
    );
    setReasons(updatedReasons);
    saveReasonsToStorage(updatedReasons);
  };

  const removeReason = (id: string) => {
    const updatedReasons = reasons.filter(r => r.id !== id);
    setReasons(updatedReasons);
    saveReasonsToStorage(updatedReasons);
  };

  return (
    <IssueReasonsContext.Provider value={{ reasons, addReason, updateReason, removeReason }}>
      {children}
    </IssueReasonsContext.Provider>
  );
}

export function useIssueReasons() {
  const context = useContext(IssueReasonsContext);
  if (context === undefined) {
    throw new Error('useIssueReasons must be used within an IssueReasonsProvider');
  }
  return context;
}
