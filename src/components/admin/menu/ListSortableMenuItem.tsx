import { useState, useEffect, useRef } from 'react';
import { MenuItem } from '@/hooks/useMenuItems';
import { formatNumberWithCommas } from '@/lib/formatNumber';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, ChefHat, Image as ImageIcon, Edit3, Check, X, Eye, EyeOff, Trash2 } from 'lucide-react';

interface ListSortableMenuItemProps {
  item: MenuItem;
  onToggleAvailability: (id: string, available: boolean) => void;
  onUpdateField: (id: string, field: 'name' | 'price', value: string | number) => void;
  onImageClick: (item: MenuItem) => void;
  onDelete: (item: MenuItem) => void;
}

export function ListSortableMenuItem({ item, onToggleAvailability, onUpdateField, onImageClick, onDelete }: ListSortableMenuItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const [editingField, setEditingField] = useState<'name' | 'price' | null>(null);
  const [tempValue, setTempValue] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 100 : 'auto' as any,
  };

  useEffect(() => {
    if (editingField && inputRef.current) { inputRef.current.focus(); inputRef.current.select(); }
  }, [editingField]);

  const handleStartEdit = (field: 'name' | 'price') => {
    setEditingField(field);
    setTempValue(field === 'name' ? item.name : item.price.toString());
  };

  const handleSaveEdit = () => {
    if (editingField && tempValue.trim()) {
      const value = editingField === 'price' ? Number(tempValue) : tempValue;
      onUpdateField(item.id, editingField, value);
    }
    setEditingField(null);
    setTempValue('');
  };

  const handleCancelEdit = () => { setEditingField(null); setTempValue(''); };
  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === 'Enter') handleSaveEdit(); else if (e.key === 'Escape') handleCancelEdit(); };

  return (
    <div ref={setNodeRef} style={style} className={`bg-card border rounded-xl p-3 shadow-soft hover:shadow-elevated transition-all ${!item.is_available ? 'opacity-60 bg-muted/30' : ''} ${isDragging ? 'ring-2 ring-primary' : ''}`}>
      <div className="flex items-center gap-3">
        <button {...attributes} {...listeners} className="touch-none p-1.5 text-muted-foreground hover:text-foreground transition-colors cursor-grab active:cursor-grabbing rounded-lg hover:bg-muted">
          <GripVertical className="w-5 h-5" />
        </button>

        <button onClick={() => onImageClick(item)} className="relative w-14 h-14 rounded-xl overflow-hidden bg-muted flex-shrink-0 group ring-2 ring-border">
          {item.image ? <img src={item.image} alt={item.name} className="w-full h-full object-cover" /> : (
            <div className="w-full h-full flex items-center justify-center"><ChefHat className="w-6 h-6 text-muted-foreground/50" /></div>
          )}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <ImageIcon className="w-5 h-5 text-white" />
          </div>
        </button>

        <div className="flex-1 min-w-0">
          {editingField === 'name' ? (
            <div className="flex items-center gap-1">
              <Input ref={inputRef} value={tempValue} onChange={(e) => setTempValue(e.target.value)} onKeyDown={handleKeyDown} onBlur={handleSaveEdit} className="h-8 text-sm font-semibold" />
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleSaveEdit}><Check className="w-4 h-4 text-success" /></Button>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleCancelEdit}><X className="w-4 h-4 text-destructive" /></Button>
            </div>
          ) : (
            <button onClick={() => handleStartEdit('name')} className="block w-full text-right font-bold text-foreground text-sm truncate hover:text-primary transition-colors group">
              {item.name}<Edit3 className="w-3 h-3 inline mr-1 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          )}
          {editingField === 'price' ? (
            <div className="flex items-center gap-1 mt-1">
              <Input ref={inputRef} type="number" value={tempValue} onChange={(e) => setTempValue(e.target.value)} onKeyDown={handleKeyDown} onBlur={handleSaveEdit} className="h-7 text-sm w-24" />
              <span className="text-xs text-muted-foreground">د.ع</span>
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleSaveEdit}><Check className="w-3 h-3 text-success" /></Button>
            </div>
          ) : (
            <button onClick={() => handleStartEdit('price')} className="text-sm text-primary font-bold hover:underline mt-0.5">
              {formatNumberWithCommas(item.price)} د.ع
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => onToggleAvailability(item.id, !item.is_available)}
            className={`p-2 rounded-lg transition-colors ${item.is_available ? 'bg-success/10 text-success hover:bg-success/20' : 'bg-destructive/10 text-destructive hover:bg-destructive/20'}`}
            title={item.is_available ? 'متوفر - اضغط للإخفاء' : 'غير متوفر - اضغط للإظهار'}>
            {item.is_available ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>
        </div>

        <button onClick={() => onDelete(item)} className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors" title="حذف الصنف">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
