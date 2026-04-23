import { ReactNode } from 'react';
import { toEnglishNumbers } from '@/lib/formatNumber';

interface Tab {
  id: string;
  label: string;
  icon: ReactNode;
  count?: number;
}

interface BottomNavigationProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export function BottomNavigation({ tabs, activeTab, onTabChange }: BottomNavigationProps) {
  return (
    <nav className="px-3 pb-3 sm:pb-4 pt-1 z-50 shrink-0 pb-safe">
      <div className="bg-card rounded-full shadow-floating border border-border/40 px-2 py-2 flex items-center justify-around mx-auto max-w-2xl backdrop-blur-xl">
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`relative flex items-center justify-center gap-2 transition-all duration-300 rounded-full ${
                isActive
                  ? 'bg-primary text-primary-foreground shadow-button px-4 py-2.5 sm:px-5 sm:py-3 scale-105'
                  : 'text-muted-foreground hover:text-primary hover:bg-primary/5 px-3 py-2.5 sm:px-4 sm:py-3'
              }`}
              aria-label={tab.label}
            >
              <span className="flex items-center justify-center [&>svg]:w-5 [&>svg]:h-5">
                {tab.icon}
              </span>
              {isActive && (
                <span className="text-xs font-semibold whitespace-nowrap animate-fade-in">
                  {tab.label}
                </span>
              )}
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-destructive text-destructive-foreground rounded-full text-[10px] font-bold flex items-center justify-center shadow-soft ring-2 ring-card`}>
                  {toEnglishNumbers(tab.count)}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
