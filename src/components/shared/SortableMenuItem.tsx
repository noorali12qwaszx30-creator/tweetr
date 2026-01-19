import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Plus, Menu as MenuIcon } from 'lucide-react';
import { toEnglishNumbers, formatNumberWithCommas } from '@/lib/formatNumber';
import { MenuItem } from '@/hooks/useMenuItems';

interface SortableMenuItemProps {
  item: MenuItem;
  quantity: number;
  isAnimating: boolean;
  onSelect: (item: MenuItem) => void;
  variant?: 'primary' | 'warning';
}

export function SortableMenuItem({ 
  item, 
  quantity, 
  isAnimating, 
  onSelect,
  variant = 'primary' 
}: SortableMenuItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const accentColor = variant === 'warning' ? 'warning' : 'primary';

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => onSelect(item)}
      className={`flex items-center gap-3 bg-card border rounded-xl p-3 hover:border-${accentColor} hover:shadow-soft transition-all duration-200 cursor-pointer relative ${
        quantity > 0 ? `border-${accentColor} bg-${accentColor}/5` : 'border-border'
      } ${isAnimating ? 'animate-[pop_0.3s_ease-out]' : ''}`}
    >
      {quantity > 0 && (
        <div className={`absolute -top-2 -right-2 w-6 h-6 bg-${accentColor} text-${accentColor}-foreground rounded-full flex items-center justify-center text-xs font-bold shadow-md ${isAnimating ? 'animate-[bounce_0.3s_ease-out]' : ''}`}>
          {toEnglishNumbers(quantity)}
        </div>
      )}
      
      <div
        {...attributes}
        {...listeners}
        className="p-1 cursor-grab active:cursor-grabbing touch-none"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="w-4 h-4 text-muted-foreground" />
      </div>
      
      {item.image ? (
        <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
          <MenuIcon className="w-5 h-5 text-muted-foreground" />
        </div>
      )}
      
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-sm text-foreground truncate">{item.name}</h3>
        <p className={`text-${accentColor} font-bold text-sm`}>{formatNumberWithCommas(item.price)} د.ع</p>
      </div>
      
      <div className={`h-10 w-10 rounded-full bg-${accentColor}/10 flex items-center justify-center text-${accentColor} flex-shrink-0 ${isAnimating ? 'animate-[ping_0.3s_ease-out]' : ''}`}>
        <Plus className="w-5 h-5" />
      </div>
    </div>
  );
}
