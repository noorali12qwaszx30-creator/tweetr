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
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border shadow-elevated pb-safe z-50">
      <div className="container flex">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex-1 py-3 flex flex-col items-center gap-1 transition-colors relative ${
              activeTab === tab.id ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            {tab.icon}
            <span className="text-xs font-medium">{tab.label}</span>
            {tab.count !== undefined && tab.count > 0 && (
              <span className="absolute top-1 right-1/2 translate-x-4 w-5 h-5 bg-destructive text-destructive-foreground rounded-full text-xs flex items-center justify-center">
                {toEnglishNumbers(tab.count)}
              </span>
            )}
          </button>
        ))}
      </div>
    </nav>
  );
}
