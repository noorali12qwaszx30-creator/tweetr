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
  isPrimary?: boolean;
}

interface BottomNavigationProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  primaryTabId?: string;
}

export function BottomNavigation({ tabs, activeTab, onTabChange, primaryTabId }: BottomNavigationProps) {
  const primaryTab =
    tabs.find(t => t.id === primaryTabId) ||
    tabs.find(t => t.isPrimary) ||
    tabs[Math.floor(tabs.length / 2)];

  const sideTabs = tabs.filter(t => t.id !== primaryTab?.id);
  const half = Math.ceil(sideTabs.length / 2);
  const leftTabs = sideTabs.slice(0, half);
  const rightTabs = sideTabs.slice(half);

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
        className={`relative flex flex-col items-center justify-center gap-0.5 py-1.5 px-1 flex-1 min-w-0 transition-all duration-300 ${
          isActive ? 'text-primary' : 'text-muted-foreground hover:text-primary/70'
        }`}
        aria-label={tab.label}
      >
        <span className={`flex items-center justify-center [&>svg]:w-[20px] [&>svg]:h-[20px] transition-transform duration-300 ${isActive ? 'scale-110' : ''}`}>
          {tab.icon}
        </span>
        <span className={`text-[10px] leading-tight truncate max-w-full px-0.5 ${isActive ? 'font-semibold' : 'opacity-75'}`}>
          {tab.label}
        </span>
        {tab.count !== undefined && tab.count > 0 && (
          <span className="absolute top-0 right-0 min-w-[16px] h-[16px] px-1 bg-destructive text-destructive-foreground rounded-full text-[9px] font-bold flex items-center justify-center shadow-soft ring-2 ring-card">
            {toEnglishNumbers(tab.count)}
          </span>
        )}
      </button>
    );
  };

  return (
    <nav className="relative z-50 shrink-0 pb-safe">
      <div className="bg-card rounded-t-[1.5rem] shadow-floating border-t border-x border-border/40">
        <div className="relative flex items-stretch justify-between h-[64px] px-1.5">
          {/* Left side tabs */}
          <div className="flex items-stretch flex-1 min-w-0">
            {leftTabs.map(renderTab)}
          </div>

          {/* Center FAB spacer */}
          {primaryTab && <div className="w-14 shrink-0" aria-hidden="true" />}

          {/* Right side tabs */}
          <div className="flex items-stretch flex-1 min-w-0">
            {rightTabs.map(renderTab)}
          </div>

          {/* Floating center action button */}
          {primaryTab && (
            <button
              onClick={() => handleTabChange(primaryTab.id)}
              className={`absolute left-1/2 -translate-x-1/2 -top-5 w-[52px] h-[52px] rounded-full bg-accent text-accent-foreground flex flex-col items-center justify-center shadow-floating transition-all duration-300 active:scale-95 ring-4 ring-background ${
                activeTab === primaryTab.id ? 'scale-110' : ''
              }`}
              aria-label={primaryTab.label}
            >
              <span className="flex items-center justify-center [&>svg]:w-[22px] [&>svg]:h-[22px]">
                {primaryTab.icon}
              </span>
              {primaryTab.count !== undefined && primaryTab.count > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-destructive text-destructive-foreground rounded-full text-[10px] font-bold flex items-center justify-center shadow-soft ring-2 ring-background">
                  {toEnglishNumbers(primaryTab.count)}
                </span>
              )}
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
