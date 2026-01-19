import { Button } from '@/components/ui/button';

interface CategoryTabsProps {
  categories: string[];
  selectedCategory: string | null;
  onSelectCategory: (category: string | null) => void;
  variant?: 'primary' | 'warning';
}

export function CategoryTabs({ 
  categories, 
  selectedCategory, 
  onSelectCategory,
  variant = 'primary'
}: CategoryTabsProps) {
  const buttonVariant = variant === 'warning' ? 'warning' : 'default';

  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      <Button
        variant={selectedCategory === null ? buttonVariant : 'outline'}
        size="sm"
        className="flex-shrink-0 h-8 text-xs"
        onClick={() => onSelectCategory(null)}
      >
        الكل
      </Button>
      {categories.map(cat => (
        <Button
          key={cat}
          variant={selectedCategory === cat ? buttonVariant : 'outline'}
          size="sm"
          className="flex-shrink-0 h-8 text-xs"
          onClick={() => onSelectCategory(cat)}
        >
          {cat}
        </Button>
      ))}
    </div>
  );
}
