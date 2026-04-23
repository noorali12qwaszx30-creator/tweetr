import { ReactNode } from 'react';
import { toEnglishNumbers } from '@/lib/formatNumber';

const triggerHaptic = (tabId: string, currentTab: string) => {
  if (tabId === currentTab) return;
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(15);
    } catch {
      // Ignore unsupported devices
    }
  }
};

interface Tab {
  id: string;
  label: string;
  icon: ReactNode;
  count?: number;
  /** @deprecated kept for backwards compatibility — no longer renders a center FAB */
  isPrimary?: boolean;
}

interface BottomNavigationProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  /** @deprecated kept for backwards compatibility */
  primaryTabId?: string;
}

export function BottomNavigation({ tabs, activeTab, onTabChange }: BottomNavigationProps) {
  const handleTabChange = (tabId: string) => {
    triggerHaptic(tabId, activeTab);
    onTabChange(tabId);
  };

  const renderTab = (tab: Tab) => {
    const isActive = activeTab === tab.id;
    return (
      <button
        key={tab.id}
        onClick={() => handleTabChange(tab.id)}
        className={`relative flex flex-col items-center justify-center gap-0.5 py-1.5 px-1 flex-1 min-w-0 rounded-2xl mx-0.5 transition-all duration-300 ${
          isActive
            ? 'bg-primary text-primary-foreground shadow-button'
            : 'text-muted-foreground hover:text-primary/80 hover:bg-muted/50'
        }`}
        aria-label={tab.label}
        aria-current={isActive ? 'page' : undefined}
      >
        <span className={`flex items-center justify-center [&>svg]:w-[20px] [&>svg]:h-[20px] transition-transform duration-300 ${isActive ? 'scale-110' : ''}`}>
          {tab.icon}
        </span>
        <span className={`text-[10px] leading-tight truncate max-w-full px-0.5 ${isActive ? 'font-bold' : 'opacity-75'}`}>
          {tab.label}
        </span>
        {tab.count !== undefined && tab.count > 0 && (
          <span className={`absolute top-0.5 right-0.5 min-w-[16px] h-[16px] px-1 rounded-full text-[9px] font-bold flex items-center justify-center shadow-soft ring-2 ${
            isActive
              ? 'bg-card text-primary ring-primary'
              : 'bg-destructive text-destructive-foreground ring-card'
          }`}>
            {toEnglishNumbers(tab.count)}
          </span>
        )}
      </button>
    );
  };

  return (
    <nav className="relative z-50 shrink-0 pb-safe">
      <div className="bg-card rounded-t-[1.5rem] shadow-floating border-t border-x border-border/40">
        <div className="flex items-stretch h-[64px] px-1.5">
          {tabs.map(renderTab)}
        </div>
      </div>
    </nav>
  );
}
