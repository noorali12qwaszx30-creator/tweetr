import { MenuItem } from '@/hooks/useMenuItems';
import { formatNumberWithCommas } from '@/lib/formatNumber';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ChefHat, Image as ImageIcon, Edit3, Trash2 } from 'lucide-react';

interface GridMenuItemProps {
  item: MenuItem;
  onToggleAvailability: (id: string, available: boolean) => void;
  onImageClick: (item: MenuItem) => void;
  onEdit: (item: MenuItem) => void;
  onDelete: (item: MenuItem) => void;
}

export function GridMenuItem({ item, onToggleAvailability, onImageClick, onEdit, onDelete }: GridMenuItemProps) {
  return (
    <div className={`relative bg-card border rounded-2xl overflow-hidden shadow-soft hover:shadow-elevated transition-all group ${!item.is_available ? 'opacity-60' : ''}`}>
      <button onClick={() => onImageClick(item)} className="relative w-full aspect-square bg-muted">
        {item.image ? (
          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ChefHat className="w-12 h-12 text-muted-foreground/30" />
          </div>
        )}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <ImageIcon className="w-8 h-8 text-white" />
        </div>
        <div className="absolute top-2 right-2">
          <Badge variant={item.is_available ? "default" : "destructive"} className="text-xs font-medium">
            {item.is_available ? 'متوفر' : 'نفذ'}
          </Badge>
        </div>
      </button>

      <div className="p-3 space-y-2">
        <h3 className="font-bold text-sm text-foreground truncate">{item.name}</h3>
        <p className="text-primary font-bold text-lg">{formatNumberWithCommas(item.price)} د.ع</p>
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <Switch checked={item.is_available} onCheckedChange={(checked) => onToggleAvailability(item.id, checked)} className="scale-90" />
          <div className="flex gap-1">
            <button onClick={() => onEdit(item)} className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors">
              <Edit3 className="w-4 h-4" />
            </button>
            <button onClick={() => onDelete(item)} className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
