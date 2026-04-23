import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, MapPin, Package, DollarSign, Edit2, Trash2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { DeliveryArea } from '@/hooks/useDeliveryAreas';
import { formatNumberWithCommas, toEnglishNumbers } from '@/lib/formatNumber';

interface Props {
  area: DeliveryArea;
  onEdit: (area: DeliveryArea) => void;
  onDelete: (area: DeliveryArea) => void;
  onToggle: (area: DeliveryArea) => void;
  position: number;
}

export function SortableAreaItem({ area, onEdit, onDelete, onToggle, position }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: area.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-card border rounded-xl p-3 shadow-soft transition-all ${
        area.is_active ? 'border-border' : 'border-muted opacity-60'
      } ${isDragging ? 'ring-2 ring-primary' : ''}`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <button
            {...attributes}
            {...listeners}
            className="touch-none cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-1"
            aria-label="اسحب لإعادة الترتيب"
          >
            <GripVertical className="w-5 h-5" />
          </button>
          <span className="text-xs font-bold text-muted-foreground bg-muted rounded-full w-6 h-6 flex items-center justify-center shrink-0">
            {toEnglishNumbers(position)}
          </span>
          <MapPin className={`w-4 h-4 shrink-0 ${area.is_active ? 'text-primary' : 'text-muted-foreground'}`} />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sm truncate">{area.name}</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Package className="w-3 h-3" />
                {toEnglishNumbers(area.order_count)}
              </span>
              <span className="flex items-center gap-1 text-primary font-medium">
                <DollarSign className="w-3 h-3" />
                {formatNumberWithCommas(area.delivery_fee)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <Switch checked={area.is_active} onCheckedChange={() => onToggle(area)} />
          <Button size="icon" variant="ghost" onClick={() => onEdit(area)}>
            <Edit2 className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            onClick={() => onDelete(area)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}