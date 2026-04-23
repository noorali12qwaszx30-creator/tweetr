import { ReactNode } from 'react';
import { toEnglishNumbers } from '@/lib/formatNumber';

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
  // Determine which tab should be the centered floating action button (FAB).
  // Priority: explicit primaryTabId prop > tab marked isPrimary > middle tab.
  const primaryTab =
    tabs.find(t => t.id === primaryTabId) ||
    tabs.find(t => t.isPrimary) ||
    tabs[Math.floor(tabs.length / 2)];

  const sideTabs = tabs.filter(t => t.id !== primaryTab?.id);
  const half = Math.ceil(sideTabs.length / 2);
  const leftTabs = sideTabs.slice(0, half);
  const rightTabs = sideTabs.slice(half);

  const renderTab = (tab: Tab) => {
    const isActive = activeTab === tab.id;
    return (
      <button
        key={tab.id}
        onClick={() => onTabChange(tab.id)}
        className={`relative flex flex-col items-center justify-center gap-0.5 py-2 px-3 transition-all duration-300 ${
          isActive ? 'text-primary' : 'text-muted-foreground hover:text-primary/70'
        }`}
        aria-label={tab.label}
      >
        <span className={`flex items-center justify-center [&>svg]:w-6 [&>svg]:h-6 transition-transform duration-300 ${isActive ? 'scale-110' : ''}`}>
          {tab.icon}
        </span>
        {isActive && (
          <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary rounded-full" />
        )}
        {tab.count !== undefined && tab.count > 0 && (
          <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 bg-destructive text-destructive-foreground rounded-full text-[10px] font-bold flex items-center justify-center shadow-soft ring-2 ring-card">
            {toEnglishNumbers(tab.count)}
          </span>
        )}
      </button>
    );
  };

  return (
    <nav className="relative z-50 shrink-0 pb-safe">
      <div className="bg-card rounded-t-[2rem] shadow-floating border-t border-x border-border/40">
        <div className="container relative flex items-center justify-between h-16 px-4">
          {/* Left side tabs */}
          <div className="flex items-center justify-around flex-1">
            {leftTabs.map(renderTab)}
          </div>

          {/* Center FAB spacer */}
          {primaryTab && <div className="w-16 shrink-0" aria-hidden="true" />}

          {/* Right side tabs */}
          <div className="flex items-center justify-around flex-1">
            {rightTabs.map(renderTab)}
          </div>

          {/* Floating center action button */}
          {primaryTab && (
            <button
              onClick={() => onTabChange(primaryTab.id)}
              className={`absolute left-1/2 -translate-x-1/2 -top-6 w-14 h-14 rounded-full bg-accent text-accent-foreground flex items-center justify-center shadow-floating transition-all duration-300 hover:scale-110 active:scale-95 ring-4 ring-background ${
                activeTab === primaryTab.id ? 'scale-110' : ''
              }`}
              aria-label={primaryTab.label}
            >
              <span className="flex items-center justify-center [&>svg]:w-6 [&>svg]:h-6">
                {primaryTab.icon}
              </span>
              {primaryTab.count !== undefined && primaryTab.count > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[20px] h-[20px] px-1 bg-destructive text-destructive-foreground rounded-full text-[10px] font-bold flex items-center justify-center shadow-soft ring-2 ring-background">
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
