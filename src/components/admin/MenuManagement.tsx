import { useState, useRef, useEffect } from 'react';
import { useMenuItems, MenuItem } from '@/hooks/useMenuItems';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatNumberWithCommas } from '@/lib/formatNumber';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Settings,
  FolderPlus,
  LayoutGrid,
  List,
  ChefHat,
  Package,
  Eye,
  EyeOff,
  Filter,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Category Management Modal
function CategoryManagementModal({
  open,
  onClose,
  categories,
  menuItems,
  onUpdateCategory,
  onDeleteCategory,
  onAddCategory,
}: {
  open: boolean;
  onClose: () => void;
  categories: string[];
  menuItems: MenuItem[];
  onUpdateCategory: (oldName: string, newName: string) => Promise<void>;
  onDeleteCategory: (category: string) => Promise<void>;
  onAddCategory: (name: string) => void;
}) {
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [loading, setLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const getCategoryItemCount = (category: string) => {
    return menuItems.filter(item => item.category === category).length;
  };

  const handleEditStart = (category: string) => {
    setEditingCategory(category);
    setEditValue(category);
  };

  const handleEditSave = async () => {
    if (!editingCategory || !editValue.trim() || editValue === editingCategory) {
      setEditingCategory(null);
      return;
    }
    setLoading(true);
    await onUpdateCategory(editingCategory, editValue.trim());
    setLoading(false);
    setEditingCategory(null);
  };

  const handleDelete = async (category: string) => {
    setLoading(true);
    await onDeleteCategory(category);
    setLoading(false);
    setDeleteConfirm(null);
  };

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return;
    if (categories.includes(newCategoryName.trim())) {
      toast.error('هذا القسم موجود بالفعل');
      return;
    }
    onAddCategory(newCategoryName.trim());
    setNewCategoryName('');
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-٣">
              <div className="p-٢ rounded-xl bg-primary/١٠">
                <Settings className="w-٥ h-٥ text-primary" />
              </div>
              إدارة الأقسام
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-٤">
            {/* Add New Category */}
            <div className="flex gap-٢ p-٣ bg-muted/٣٠ rounded-xl border border-dashed border-border">
              <Input
                placeholder="اسم القسم الجديد..."
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                className="flex-١ bg-background"
              />
              <Button
                onClick={handleAddCategory}
                disabled={!newCategoryName.trim()}
                size="sm"
                className="bg-primary hover:bg-primary/٩٠"
              >
                <FolderPlus className="w-٤ h-٤ ml-١" />
                إضافة
              </Button>
            </div>

            {/* Categories List */}
            <ScrollArea className="h-[٣٠٠px]">
              <div className="space-y-٢">
                {categories.length === 0 ? (
                  <div className="text-center py-٨ text-muted-foreground">
                    <Package className="w-١٢ h-١٢ mx-auto mb-٤ opacity-٣٠" />
                    <p>لا توجد أقسام</p>
                  </div>
                ) : (
                  categories.map((category, index) => (
                    <div
                      key={category}
                      className="flex items-center gap-٣ p-٣ bg-card rounded-xl border shadow-soft hover:shadow-elevated transition-all group"
                    >
                      <div className="flex items-center justify-center w-٨ h-٨ rounded-lg bg-primary/١٠ text-primary font-bold text-sm">
                        {index + 1}
                      </div>
                      
                      {editingCategory === category ? (
                        <Input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleEditSave();
                            if (e.key === 'Escape') setEditingCategory(null);
                          }}
                          onBlur={handleEditSave}
                          autoFocus
                          className="flex-١ h-٨"
                          disabled={loading}
                        />
                      ) : (
                        <>
                          <span className="flex-١ font-semibold text-foreground">{category}</span>
                          <Badge variant="secondary" className="font-medium">
                            {getCategoryItemCount(category)} صنف
                          </Badge>
                          <div className="flex gap-١ opacity-٠ group-hover:opacity-١٠٠ transition-opacity">
                            <button
                              onClick={() => handleEditStart(category)}
                              className="p-٢ text-muted-foreground hover:text-primary hover:bg-primary/١٠ rounded-lg transition-colors"
                              title="تعديل"
                            >
                              <Edit3 className="w-٤ h-٤" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(category)}
                              className="p-٢ text-muted-foreground hover:text-destructive hover:bg-destructive/١٠ rounded-lg transition-colors"
                              title="حذف"
                            >
                              <Trash2 className="w-٤ h-٤" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Category Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد حذف القسم</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف قسم "{deleteConfirm}"؟
              <br />
              <span className="text-destructive font-medium">
                سيتم حذف جميع الأصناف ({getCategoryItemCount(deleteConfirm || '')}) في هذا القسم!
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-٢ sm:gap-٠">
            <AlertDialogCancel disabled={loading}>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
              disabled={loading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/٩٠"
            >
              {loading ? <Loader2 className="w-٤ h-٤ animate-spin ml-٢" /> : null}
              حذف القسم والأصناف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// Grid View Item Component
function GridMenuItem({
  item,
  onToggleAvailability,
  onImageClick,
  onEdit,
  onDelete,
}: {
  item: MenuItem;
  onToggleAvailability: (id: string, available: boolean) => void;
  onImageClick: (item: MenuItem) => void;
  onEdit: (item: MenuItem) => void;
  onDelete: (item: MenuItem) => void;
}) {
  return (
    <div
      className={`relative bg-card border rounded-2xl overflow-hidden shadow-soft hover:shadow-elevated transition-all group ${
        !item.is_available ? 'opacity-60' : ''
      }`}
    >
      {/* Image */}
      <button
        onClick={() => onImageClick(item)}
        className="relative w-full aspect-square bg-muted"
      >
        {item.image ? (
          <img
            src={item.image}
            alt={item.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ChefHat className="w-12 h-12 text-muted-foreground/30" />
          </div>
        )}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <ImageIcon className="w-8 h-8 text-white" />
        </div>
        
        {/* Availability Badge */}
        <div className="absolute top-2 right-2">
          <Badge 
            variant={item.is_available ? "default" : "destructive"}
            className="text-xs font-medium"
          >
            {item.is_available ? 'متوفر' : 'نفذ'}
          </Badge>
        </div>
      </button>

      {/* Content */}
      <div className="p-3 space-y-2">
        <h3 className="font-bold text-sm text-foreground truncate">{item.name}</h3>
        <p className="text-primary font-bold text-lg">{formatNumberWithCommas(item.price)} د.ع</p>
        
        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <Switch
            checked={item.is_available}
            onCheckedChange={(checked) => onToggleAvailability(item.id, checked)}
            className="scale-90"
          />
          <div className="flex gap-1">
            <button
              onClick={() => onEdit(item)}
              className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(item)}
              className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// List View Sortable Item Component
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
    zIndex: isDragging ? 100 : 'auto',
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
      className={`bg-card border rounded-xl p-3 shadow-soft hover:shadow-elevated transition-all ${
        !item.is_available ? 'opacity-60 bg-muted/30' : ''
      } ${isDragging ? 'ring-2 ring-primary' : ''}`}
    >
      <div className="flex items-center gap-3">
        {/* Drag Handle */}
        <button
          {...attributes}
          {...listeners}
          className="touch-none p-1.5 text-muted-foreground hover:text-foreground transition-colors cursor-grab active:cursor-grabbing rounded-lg hover:bg-muted"
        >
          <GripVertical className="w-5 h-5" />
        </button>

        {/* Image */}
        <button
          onClick={() => onImageClick(item)}
          className="relative w-14 h-14 rounded-xl overflow-hidden bg-muted flex-shrink-0 group ring-2 ring-border"
        >
          {item.image ? (
            <img
              src={item.image}
              alt={item.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ChefHat className="w-6 h-6 text-muted-foreground/50" />
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
              className="block w-full text-right font-bold text-foreground text-sm truncate hover:text-primary transition-colors group"
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
              className="text-sm text-primary font-bold hover:underline mt-0.5"
            >
              {formatNumberWithCommas(item.price)} د.ع
            </button>
          )}
        </div>

        {/* Availability Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onToggleAvailability(item.id, !item.is_available)}
            className={`p-2 rounded-lg transition-colors ${
              item.is_available 
                ? 'bg-success/10 text-success hover:bg-success/20' 
                : 'bg-destructive/10 text-destructive hover:bg-destructive/20'
            }`}
            title={item.is_available ? 'متوفر - اضغط للإخفاء' : 'غير متوفر - اضغط للإظهار'}
          >
            {item.is_available ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>
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
    </div>
  );
}

// Add/Edit Item Modal
function ItemModal({
  isOpen,
  onClose,
  onSave,
  categories,
  selectedCategory,
  editItem,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: { name: string; price: number; image: string | null; category: string }) => Promise<void>;
  categories: string[];
  selectedCategory: string;
  editItem?: MenuItem | null;
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
      if (editItem) {
        setName(editItem.name);
        setPrice(editItem.price.toString());
        setCategory(editItem.category);
        setImage(editItem.image);
      } else {
        setName('');
        setPrice('');
        setCategory(selectedCategory);
        setImage(null);
      }
      setNewCategory('');
    }
  }, [isOpen, selectedCategory, editItem]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
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
      await onSave({
        name: name.trim(),
        price: Number(price),
        image,
        category: finalCategory,
      });
      onClose();
    } catch (error) {
      // Error handled in parent
    }
    setLoading(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              {editItem ? <Edit3 className="w-5 h-5 text-primary" /> : <Plus className="w-5 h-5 text-primary" />}
            </div>
            {editItem ? 'تعديل الصنف' : 'إضافة صنف جديد'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Image Upload */}
          <div className="flex justify-center">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-32 h-32 rounded-2xl border-2 border-dashed border-border hover:border-primary transition-colors flex items-center justify-center bg-muted/30 overflow-hidden group"
            >
              {uploading ? (
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
              ) : image ? (
                <div className="relative w-full h-full">
                  <img src={image} alt="Preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <ImageIcon className="w-8 h-8 text-white" />
                  </div>
                </div>
              ) : (
                <div className="text-center p-4">
                  <ImageIcon className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
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
            <Label className="text-sm font-medium">اسم الصنف</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: برجر دجاج"
              className="h-11"
            />
          </div>

          {/* Price */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">السعر (د.ع)</Label>
            <Input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="5000"
              className="h-11"
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">القسم</Label>
            {categories.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => {
                      setCategory(cat);
                      setNewCategory('');
                    }}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                      category === cat && !newCategory
                        ? 'bg-primary text-primary-foreground shadow-soft'
                        : 'bg-muted hover:bg-muted/80 text-foreground'
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
              className="h-11"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 mt-4">
          <Button variant="outline" onClick={onClose} disabled={loading} className="h-11">
            إلغاء
          </Button>
          <Button onClick={handleSubmit} disabled={loading} className="h-11 min-w-[100px]">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (editItem ? 'حفظ التعديلات' : 'إضافة')}
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
          <DialogTitle className="text-center">تحديث صورة {item?.name}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-4">
          {uploading ? (
            <div className="py-8">
              <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
              <p className="text-sm text-muted-foreground mt-4 text-center">جاري الرفع...</p>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-10 border-2 border-dashed border-border rounded-2xl hover:border-primary transition-colors bg-muted/30"
            >
              <ImageIcon className="w-14 h-14 mx-auto text-muted-foreground mb-3" />
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
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterAvailability, setFilterAvailability] = useState<'all' | 'available' | 'unavailable'>('all');
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [imageUpdateItem, setImageUpdateItem] = useState<MenuItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<MenuItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [categoryManagementOpen, setCategoryManagementOpen] = useState(false);

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

  // Filter items
  const filteredItems = menuItems
    .filter((item) => {
      const matchesCategory = !activeCategory || item.category === activeCategory;
      const matchesSearch = !searchQuery || 
        item.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesAvailability = 
        filterAvailability === 'all' ||
        (filterAvailability === 'available' && item.is_available) ||
        (filterAvailability === 'unavailable' && !item.is_available);
      return matchesCategory && matchesSearch && matchesAvailability;
    })
    .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = filteredItems.findIndex((item) => item.id === active.id);
      const newIndex = filteredItems.findIndex((item) => item.id === over.id);

      const reorderedItems = arrayMove(filteredItems, oldIndex, newIndex);

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

  const handleSaveItem = async (item: { name: string; price: number; image: string | null; category: string }) => {
    if (editingItem) {
      await updateMenuItem(editingItem.id, item);
    } else {
      await addMenuItem(item);
    }
    setEditingItem(null);
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

  const handleEditItem = (item: MenuItem) => {
    setEditingItem(item);
    setItemModalOpen(true);
  };

  // Category management handlers
  const handleUpdateCategory = async (oldName: string, newName: string) => {
    const itemsToUpdate = menuItems.filter(item => item.category === oldName);
    for (const item of itemsToUpdate) {
      await updateMenuItem(item.id, { category: newName });
    }
    refetch();
    if (activeCategory === oldName) {
      setActiveCategory(newName);
    }
    toast.success(`تم تحديث اسم القسم إلى "${newName}"`);
  };

  const handleDeleteCategory = async (category: string) => {
    const itemsToDelete = menuItems.filter(item => item.category === category);
    for (const item of itemsToDelete) {
      await deleteMenuItem(item.id);
    }
    refetch();
    if (activeCategory === category && categories.length > 1) {
      const newActive = categories.find(c => c !== category);
      if (newActive) setActiveCategory(newActive);
    }
    toast.success(`تم حذف القسم "${category}" وجميع أصنافه`);
  };

  const handleAddCategory = (name: string) => {
    setActiveCategory(name);
    setItemModalOpen(true);
    toast.info(`أضف أول صنف في قسم "${name}"`);
  };

  const totalItems = menuItems.length;
  const availableItems = menuItems.filter(i => i.is_available).length;
  const unavailableItems = totalItems - availableItems;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">جاري تحميل القائمة...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card border rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-foreground">{totalItems}</p>
          <p className="text-xs text-muted-foreground">إجمالي الأصناف</p>
        </div>
        <div className="bg-success/10 border border-success/20 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-success">{availableItems}</p>
          <p className="text-xs text-success">متوفر</p>
        </div>
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-destructive">{unavailableItems}</p>
          <p className="text-xs text-destructive">نفذ</p>
        </div>
      </div>

      {/* Search & Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث عن صنف..."
            className="pr-10 h-11 bg-card"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {/* Filter Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-11 gap-2">
                <Filter className="w-4 h-4" />
                <span className="hidden sm:inline">فلترة</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>حسب التوفر</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setFilterAvailability('all')}>
                <Check className={`w-4 h-4 ml-2 ${filterAvailability === 'all' ? 'opacity-100' : 'opacity-0'}`} />
                الكل
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterAvailability('available')}>
                <Check className={`w-4 h-4 ml-2 ${filterAvailability === 'available' ? 'opacity-100' : 'opacity-0'}`} />
                المتوفر فقط
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterAvailability('unavailable')}>
                <Check className={`w-4 h-4 ml-2 ${filterAvailability === 'unavailable' ? 'opacity-100' : 'opacity-0'}`} />
                النافذ فقط
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* View Mode Toggle */}
          <div className="flex rounded-xl border bg-card p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {/* Category Management */}
          <Button
            variant="outline"
            onClick={() => setCategoryManagementOpen(true)}
            className="h-11"
          >
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Categories Tabs */}
      {categories.length > 0 && (
        <ScrollArea className="w-full">
          <div className="flex gap-2 pb-2">
            {categories.map((category) => {
              const count = menuItems.filter((i) => i.category === category).length;
              return (
                <button
                  key={category}
                  onClick={() => setActiveCategory(category)}
                  className={`flex-shrink-0 px-4 py-2.5 rounded-xl font-medium text-sm transition-all whitespace-nowrap ${
                    activeCategory === category
                      ? 'bg-primary text-primary-foreground shadow-soft'
                      : 'bg-card border hover:bg-muted text-foreground'
                  }`}
                >
                  {category}
                  <Badge 
                    variant={activeCategory === category ? "secondary" : "outline"} 
                    className="mr-2 text-xs"
                  >
                    {count}
                  </Badge>
                </button>
              );
            })}
          </div>
        </ScrollArea>
      )}

      {/* Menu Items */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 pb-24">
          {filteredItems.length === 0 ? (
            <div className="col-span-full text-center py-16 text-muted-foreground">
              <UtensilsCrossed className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">لا توجد أصناف</p>
              <p className="text-sm">أضف صنفاً جديداً للبدء</p>
            </div>
          ) : (
            filteredItems.map((item) => (
              <GridMenuItem
                key={item.id}
                item={item}
                onToggleAvailability={handleToggleAvailability}
                onImageClick={setImageUpdateItem}
                onEdit={handleEditItem}
                onDelete={setDeleteItem}
              />
            ))
          )}
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={filteredItems.map((i) => i.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2 pb-24">
              {filteredItems.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <UtensilsCrossed className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p className="text-lg font-medium">لا توجد أصناف</p>
                  <p className="text-sm">أضف صنفاً جديداً للبدء</p>
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
      )}

      {/* Floating Add Button */}
      <Button
        size="lg"
        className="fixed bottom-24 left-6 w-14 h-14 rounded-full shadow-elevated hover:scale-110 transition-transform z-50"
        onClick={() => {
          setEditingItem(null);
          setItemModalOpen(true);
        }}
      >
        <Plus className="w-7 h-7" />
      </Button>

      {/* Modals */}
      <CategoryManagementModal
        open={categoryManagementOpen}
        onClose={() => setCategoryManagementOpen(false)}
        categories={categories}
        menuItems={menuItems}
        onUpdateCategory={handleUpdateCategory}
        onDeleteCategory={handleDeleteCategory}
        onAddCategory={handleAddCategory}
      />

      <ItemModal
        isOpen={itemModalOpen}
        onClose={() => {
          setItemModalOpen(false);
          setEditingItem(null);
        }}
        onSave={handleSaveItem}
        categories={categories}
        selectedCategory={activeCategory}
        editItem={editingItem}
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
