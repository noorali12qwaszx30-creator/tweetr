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
      className={`flex items-center gap-3 bg-card border rounded-2xl p-3 sm:p-3.5 shadow-card hover:shadow-elevated hover:-translate-y-0.5 transition-all duration-300 cursor-pointer relative ${
        quantity > 0
          ? `border-${accentColor}/40 ring-2 ring-${accentColor}/20`
          : 'border-border/50'
      } ${isAnimating ? 'animate-[pop_0.3s_ease-out]' : ''}`}
    >
      {quantity > 0 && (
        <div className={`absolute -top-2 -right-2 min-w-[24px] h-6 px-1.5 bg-${accentColor} text-${accentColor}-foreground rounded-full flex items-center justify-center text-xs font-bold shadow-button ring-2 ring-card ${isAnimating ? 'animate-[bounce_0.3s_ease-out]' : ''}`}>
          {toEnglishNumbers(quantity)}
        </div>
      )}
      
      <div
        {...attributes}
        {...listeners}
        className="p-1 cursor-grab active:cursor-grabbing touch-none text-muted-foreground/50 hover:text-muted-foreground"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="w-4 h-4 text-muted-foreground" />
      </div>
      
      {item.image ? (
        <div className="w-14 h-14 rounded-2xl overflow-hidden flex-shrink-0 shadow-soft ring-1 ring-border/30">
          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className={`w-14 h-14 bg-gradient-to-br from-${accentColor}/15 to-${accentColor}/5 rounded-2xl flex items-center justify-center flex-shrink-0 ring-1 ring-border/30`}>
          <MenuIcon className={`w-6 h-6 text-${accentColor}/70`} />
        </div>
      )}
      
      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-sm sm:text-base text-foreground truncate leading-tight">{item.name}</h3>
        <p className={`text-${accentColor} font-bold text-sm sm:text-base mt-0.5`}>
          {formatNumberWithCommas(item.price)} <span className="text-xs font-medium opacity-70">د.ع</span>
        </p>
      </div>
      
      <div className={`h-11 w-11 rounded-full bg-${accentColor} text-${accentColor}-foreground flex items-center justify-center flex-shrink-0 shadow-button transition-transform duration-300 hover:scale-110 ${isAnimating ? 'animate-[ping_0.3s_ease-out]' : ''}`}>
        <Plus className="w-5 h-5" strokeWidth={2.5} />
      </div>
    </div>
  );
}
