import { Button } from '@/components/ui/button';
import { Flame } from 'lucide-react';

interface CategoryTabsProps {
  categories: string[];
  selectedCategory: string | null;
  onSelectCategory: (category: string | null) => void;
  variant?: 'primary' | 'warning';
  showTopSelling?: boolean;
}

export function CategoryTabs({ 
  categories, 
  selectedCategory, 
  onSelectCategory,
  variant = 'primary',
  showTopSelling = false,
}: CategoryTabsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
      <CategoryPill
        active={selectedCategory === null}
        variant={variant}
        onClick={() => onSelectCategory(null)}
        label="الكل"
      />
      {showTopSelling && (
        <CategoryPill
          active={selectedCategory === '__top__'}
          variant={variant}
          onClick={() => onSelectCategory('__top__')}
          label="الأكثر طلباً"
          icon={<Flame className="w-3.5 h-3.5" />}
        />
      )}
      {categories.map(cat => (
        <CategoryPill
          key={cat}
          active={selectedCategory === cat}
          variant={variant}
          onClick={() => onSelectCategory(cat)}
          label={cat}
        />
      ))}
    </div>
  );
}

function CategoryPill({
  active,
  variant,
  onClick,
  label,
  icon,
}: {
  active: boolean;
  variant: 'primary' | 'warning';
  onClick: () => void;
  label: string;
  icon?: React.ReactNode;
}) {
  const activeClass = variant === 'warning'
    ? 'bg-warning text-warning-foreground shadow-soft'
    : 'bg-primary text-primary-foreground shadow-button';
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-shrink-0 px-4 h-9 rounded-full text-xs font-semibold transition-all duration-300 active:scale-95 inline-flex items-center gap-1.5 ${
        active
          ? `${activeClass} scale-105`
          : 'bg-card text-muted-foreground border border-border/60 hover:border-primary/40 hover:text-primary'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
