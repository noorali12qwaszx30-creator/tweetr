import { useState, useRef, useEffect } from 'react';
import { useMenuItems, MenuItem } from '@/hooks/useMenuItems';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Plus,
  GripVertical,
  Image as ImageIcon,
  Check,
  X,
  Loader2,
  UtensilsCrossed,
  Search,
  Edit3,
  Trash2,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// Sortable Menu Item Component
function SortableMenuItem({
  item,
  onToggleAvailability,
  onUpdateField,
  onImageClick,
  onDelete,
}: {
  item: MenuItem;
  onToggleAvailability: (id: string, available: boolean) => void;
  onUpdateField: (id: string, field: 'name' | 'price', value: string | number) => void;
  onImageClick: (item: MenuItem) => void;
  onDelete: (item: MenuItem) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const [editingField, setEditingField] = useState<'name' | 'price' | null>(null);
  const [tempValue, setTempValue] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  useEffect(() => {
    if (editingField && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
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

  const handleCancelEdit = () => {
    setEditingField(null);
    setTempValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-card border border-border rounded-xl p-3 shadow-soft flex items-center gap-3 transition-all hover:shadow-elevated ${
        !item.is_available ? 'opacity-60 bg-muted/50' : ''
      }`}
    >
      {/* Drag Handle */}
      <button
        {...attributes}
        {...listeners}
        className="touch-none p-1 text-muted-foreground hover:text-foreground transition-colors cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="w-5 h-5" />
      </button>

      {/* Image */}
      <button
        onClick={() => onImageClick(item)}
        className="relative w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0 group"
      >
        {item.image ? (
          <img
            src={item.image}
            alt={item.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <UtensilsCrossed className="w-6 h-6 text-muted-foreground" />
          </div>
        )}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <ImageIcon className="w-5 h-5 text-white" />
        </div>
      </button>

      {/* Details */}
      <div className="flex-1 min-w-0">
        {/* Name */}
        {editingField === 'name' ? (
          <div className="flex items-center gap-1">
            <Input
              ref={inputRef}
              value={tempValue}
              onChange={(e) => setTempValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleSaveEdit}
              className="h-8 text-sm font-semibold"
            />
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleSaveEdit}>
              <Check className="w-4 h-4 text-success" />
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleCancelEdit}>
              <X className="w-4 h-4 text-destructive" />
            </Button>
          </div>
        ) : (
          <button
            onClick={() => handleStartEdit('name')}
            className="block w-full text-right font-semibold text-foreground truncate hover:text-primary transition-colors group"
          >
            {item.name}
            <Edit3 className="w-3 h-3 inline mr-1 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        )}

        {/* Price */}
        {editingField === 'price' ? (
          <div className="flex items-center gap-1 mt-1">
            <Input
              ref={inputRef}
              type="number"
              value={tempValue}
              onChange={(e) => setTempValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleSaveEdit}
              className="h-7 text-sm w-24"
            />
            <span className="text-xs text-muted-foreground">د.ع</span>
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleSaveEdit}>
              <Check className="w-3 h-3 text-success" />
            </Button>
          </div>
        ) : (
          <button
            onClick={() => handleStartEdit('price')}
            className="text-sm text-primary font-bold hover:underline"
          >
            {item.price.toLocaleString()} د.ع
          </button>
        )}
      </div>

      {/* Availability Toggle */}
      <div className="flex items-center gap-2">
        <span className={`text-xs ${item.is_available ? 'text-success' : 'text-destructive'}`}>
          {item.is_available ? 'متوفر' : 'نفذ'}
        </span>
        <Switch
          checked={item.is_available}
          onCheckedChange={(checked) => onToggleAvailability(item.id, checked)}
        />
      </div>

      {/* Delete Button */}
      <button
        onClick={() => onDelete(item)}
        className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
        title="حذف الصنف"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

// Add Item Modal
function AddItemModal({
  isOpen,
  onClose,
  onAdd,
  categories,
  selectedCategory,
}: {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (item: { name: string; price: number; image: string | null; category: string }) => Promise<void>;
  categories: string[];
  selectedCategory: string;
}) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState(selectedCategory);
  const [newCategory, setNewCategory] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setCategory(selectedCategory);
    }
  }, [isOpen, selectedCategory]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      // Convert to base64 for now (can be replaced with storage upload)
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast.error('فشل رفع الصورة');
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!name.trim() || !price) {
      toast.error('يرجى ملء جميع الحقول');
      return;
    }

    const finalCategory = newCategory.trim() || category;
    if (!finalCategory) {
      toast.error('يرجى اختيار أو إدخال قسم');
      return;
    }

    setLoading(true);
    try {
      await onAdd({
        name: name.trim(),
        price: Number(price),
        image,
        category: finalCategory,
      });
      setName('');
      setPrice('');
      setImage(null);
      setNewCategory('');
      onClose();
    } catch (error) {
      // Error handled in parent
    }
    setLoading(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary" />
            إضافة صنف جديد
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Image Upload */}
          <div className="flex justify-center">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-28 h-28 rounded-xl border-2 border-dashed border-border hover:border-primary transition-colors flex items-center justify-center bg-muted/50 overflow-hidden"
            >
              {uploading ? (
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              ) : image ? (
                <img src={image} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <div className="text-center">
                  <ImageIcon className="w-8 h-8 mx-auto text-muted-foreground mb-1" />
                  <span className="text-xs text-muted-foreground">اضغط لرفع صورة</span>
                </div>
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label>اسم الصنف</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: برجر دجاج"
            />
          </div>

          {/* Price */}
          <div className="space-y-2">
            <Label>السعر (د.ع)</Label>
            <Input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="5000"
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label>القسم</Label>
            {categories.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => {
                      setCategory(cat);
                      setNewCategory('');
                    }}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      category === cat && !newCategory
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted hover:bg-muted/80'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}
            <Input
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="أو أدخل قسم جديد..."
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            إلغاء
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
            إضافة
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Image Update Modal
function ImageUpdateModal({
  item,
  isOpen,
  onClose,
  onUpdate,
}: {
  item: MenuItem | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (id: string, image: string) => Promise<void>;
}) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      // Auto-open file picker
      setTimeout(() => fileInputRef.current?.click(), 100);
    }
  }, [isOpen]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !item) return;

    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        await onUpdate(item.id, reader.result as string);
        setUploading(false);
        onClose();
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast.error('فشل تحديث الصورة');
      setUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle>تحديث صورة {item?.name}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4">
          {uploading ? (
            <div className="py-8">
              <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
              <p className="text-sm text-muted-foreground mt-2">جاري الرفع...</p>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-8 border-2 border-dashed border-border rounded-xl hover:border-primary transition-colors"
            >
              <ImageIcon className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">اضغط لاختيار صورة جديدة</p>
            </button>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
        />
      </DialogContent>
    </Dialog>
  );
}

// Main Component
export function MenuManagement() {
  const { menuItems, categories, loading, addMenuItem, updateMenuItem, deleteMenuItem, toggleAvailability, refetch } = useMenuItems();
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [imageUpdateItem, setImageUpdateItem] = useState<MenuItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<MenuItem | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  // Set initial category
  useEffect(() => {
    if (categories.length > 0 && !activeCategory) {
      setActiveCategory(categories[0]);
    }
  }, [categories, activeCategory]);

  // Filter items by category and search
  const filteredItems = menuItems
    .filter((item) => {
      const matchesCategory = !activeCategory || item.category === activeCategory;
      const matchesSearch = !searchQuery || 
        item.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    })
    .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = filteredItems.findIndex((item) => item.id === active.id);
      const newIndex = filteredItems.findIndex((item) => item.id === over.id);

      const reorderedItems = arrayMove(filteredItems, oldIndex, newIndex);

      // Update display_order in database
      const updates = reorderedItems.map((item, index) => ({
        id: item.id,
        display_order: index,
      }));

      for (const update of updates) {
        await supabase
          .from('menu_items')
          .update({ display_order: update.display_order })
          .eq('id', update.id);
      }

      refetch();
      toast.success('تم ترتيب الأصناف');
    }
  };

  const handleToggleAvailability = async (id: string, available: boolean) => {
    await toggleAvailability(id, available);
  };

  const handleUpdateField = async (id: string, field: 'name' | 'price', value: string | number) => {
    await updateMenuItem(id, { [field]: value });
  };

  const handleAddItem = async (item: { name: string; price: number; image: string | null; category: string }) => {
    await addMenuItem(item);
  };

  const handleImageUpdate = async (id: string, image: string) => {
    await updateMenuItem(id, { image });
  };

  const handleDeleteItem = async () => {
    if (!deleteItem) return;
    setDeleting(true);
    await deleteMenuItem(deleteItem.id);
    setDeleting(false);
    setDeleteItem(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="relative h-[calc(100vh-12rem)]">
      {/* Search Bar */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث عن صنف..."
            className="pr-10"
          />
        </div>
      </div>

      <div className="flex gap-4 h-full">
        {/* Categories Sidebar */}
        <div className="w-32 shrink-0">
          <ScrollArea className="h-full">
            <div className="space-y-2">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setActiveCategory(category)}
                  className={`w-full text-right px-3 py-3 rounded-xl font-medium text-sm transition-all ${
                    activeCategory === category
                      ? 'bg-primary text-primary-foreground shadow-soft'
                      : 'bg-card border border-border hover:bg-muted'
                  }`}
                >
                  {category}
                  <span className="block text-xs mt-0.5 opacity-80">
                    {menuItems.filter((i) => i.category === category).length} صنف
                  </span>
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Menu Items Grid */}
        <div className="flex-1">
          <ScrollArea className="h-full">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={filteredItems.map((i) => i.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3 pb-20">
                  {filteredItems.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <UtensilsCrossed className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>لا توجد أصناف في هذا القسم</p>
                    </div>
                  ) : (
                    filteredItems.map((item) => (
                      <SortableMenuItem
                        key={item.id}
                        item={item}
                        onToggleAvailability={handleToggleAvailability}
                        onUpdateField={handleUpdateField}
                        onImageClick={setImageUpdateItem}
                        onDelete={setDeleteItem}
                      />
                    ))
                  )}
                </div>
              </SortableContext>
            </DndContext>
          </ScrollArea>
        </div>
      </div>

      {/* Floating Add Button */}
      <Button
        size="lg"
        className="fixed bottom-24 left-6 w-14 h-14 rounded-full shadow-elevated hover:scale-110 transition-transform"
        onClick={() => setAddModalOpen(true)}
      >
        <Plus className="w-7 h-7" />
      </Button>

      {/* Modals */}
      <AddItemModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onAdd={handleAddItem}
        categories={categories}
        selectedCategory={activeCategory}
      />

      <ImageUpdateModal
        item={imageUpdateItem}
        isOpen={!!imageUpdateItem}
        onClose={() => setImageUpdateItem(null)}
        onUpdate={handleImageUpdate}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteItem} onOpenChange={() => setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد حذف الصنف</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف "{deleteItem?.name}"؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel disabled={deleting}>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteItem}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
