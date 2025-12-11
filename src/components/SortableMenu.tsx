import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Menu as MenuIcon, GripVertical } from 'lucide-react';
import { MenuItem } from '@/hooks/useMenuItems';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SortableMenuItemProps {
  item: MenuItem;
  onSelect: (item: MenuItem) => void;
  accentColor?: string;
}

function SortableMenuItem({ item, onSelect, accentColor = 'primary' }: SortableMenuItemProps) {
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

  const hoverBorderClass = accentColor === 'warning' ? 'hover:border-warning' : 'hover:border-primary';
  const priceClass = accentColor === 'warning' ? 'text-warning' : 'text-primary';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-card border border-border rounded-xl p-3 ${hoverBorderClass} hover:shadow-elevated transition-all duration-200 text-right relative group`}
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-2 left-2 p-1 rounded cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity bg-muted/80 hover:bg-muted"
      >
        <GripVertical className="w-4 h-4 text-muted-foreground" />
      </div>

      <button
        onClick={() => onSelect(item)}
        className="w-full text-right"
      >
        {item.image ? (
          <div className="aspect-square rounded-lg mb-2 overflow-hidden">
            <img
              src={item.image}
              alt={item.name}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="aspect-square bg-muted rounded-lg mb-2 flex items-center justify-center">
            <MenuIcon className="w-8 h-8 text-muted-foreground" />
          </div>
        )}
        <h3 className="font-semibold text-sm text-foreground truncate">{item.name}</h3>
        <p className={`${priceClass} font-bold text-sm`}>{item.price.toLocaleString()} د.ع</p>
      </button>
    </div>
  );
}

interface SortableMenuProps {
  items: MenuItem[];
  categories: string[];
  onSelectItem: (item: MenuItem) => void;
  onReorder: (items: MenuItem[]) => void;
  accentColor?: string;
}

export function SortableMenu({ 
  items, 
  categories, 
  onSelectItem, 
  onReorder,
  accentColor = 'primary' 
}: SortableMenuProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const filteredItems = selectedCategory
    ? items.filter(item => item.category === selectedCategory && item.is_available)
    : items.filter(item => item.is_available);

  // Sort by display_order
  const sortedItems = [...filteredItems].sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = sortedItems.findIndex((item) => item.id === active.id);
      const newIndex = sortedItems.findIndex((item) => item.id === over.id);

      const newItems = arrayMove(sortedItems, oldIndex, newIndex);
      
      // Update display_order for all items in this view
      const updatedItems = newItems.map((item, index) => ({
        ...item,
        display_order: index,
      }));

      onReorder(updatedItems);
    }
  };

  return (
    <div className="space-y-4">
      {/* Categories */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <Button
          variant={selectedCategory === null ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedCategory(null)}
        >
          الكل
        </Button>
        {categories.map(cat => (
          <Button
            key={cat}
            variant={selectedCategory === cat ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory(cat)}
          >
            {cat}
          </Button>
        ))}
      </div>

      {/* Menu Grid */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={sortedItems.map(i => i.id)} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {sortedItems.map(item => (
              <SortableMenuItem
                key={item.id}
                item={item}
                onSelect={onSelectItem}
                accentColor={accentColor}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {sortedItems.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <MenuIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>لا توجد أصناف متاحة</p>
        </div>
      )}
    </div>
  );
}
