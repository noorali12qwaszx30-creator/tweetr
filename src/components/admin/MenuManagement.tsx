import { useState, useEffect } from 'react';
import { useMenuItems, MenuItem } from '@/hooks/useMenuItems';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatNumberWithCommas } from '@/lib/formatNumber';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  Plus, Search, Settings, LayoutGrid, List, UtensilsCrossed, Loader2, Check, Filter, Eye, EyeOff,
} from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ListSortableMenuItem } from './menu/ListSortableMenuItem';
import { CategoryManagementModal } from './menu/CategoryManagementModal';
import { GridMenuItem } from './menu/GridMenuItem';
import { ItemModal } from './menu/ItemModal';
import { ImageUpdateModal } from './menu/ImageUpdateModal';

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
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    if (categories.length > 0 && !activeCategory) setActiveCategory(categories[0]);
  }, [categories, activeCategory]);

  const filteredItems = menuItems
    .filter((item) => {
      const matchesCategory = !activeCategory || item.category === activeCategory;
      const matchesSearch = !searchQuery || item.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesAvailability = filterAvailability === 'all' || (filterAvailability === 'available' && item.is_available) || (filterAvailability === 'unavailable' && !item.is_available);
      return matchesCategory && matchesSearch && matchesAvailability;
    })
    .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = filteredItems.findIndex((item) => item.id === active.id);
      const newIndex = filteredItems.findIndex((item) => item.id === over.id);
      const reorderedItems = arrayMove(filteredItems, oldIndex, newIndex);
      const updates = reorderedItems.map((item, index) => ({ id: item.id, display_order: index }));
      for (const update of updates) {
        await supabase.from('menu_items').update({ display_order: update.display_order }).eq('id', update.id);
      }
      refetch();
      toast.success('تم ترتيب الأصناف');
    }
  };

  const handleToggleAvailability = async (id: string, available: boolean) => { await toggleAvailability(id, available); };
  const handleUpdateField = async (id: string, field: 'name' | 'price', value: string | number) => { await updateMenuItem(id, { [field]: value }); };

  const handleSaveItem = async (item: { name: string; price: number; image: string | null; category: string }) => {
    if (editingItem) await updateMenuItem(editingItem.id, item);
    else await addMenuItem(item);
    setEditingItem(null);
  };

  const handleImageUpdate = async (id: string, image: string) => { await updateMenuItem(id, { image }); };

  const handleDeleteItem = async () => {
    if (!deleteItem) return;
    setDeleting(true);
    await deleteMenuItem(deleteItem.id);
    setDeleting(false);
    setDeleteItem(null);
  };

  const handleEditItem = (item: MenuItem) => { setEditingItem(item); setItemModalOpen(true); };

  const handleUpdateCategory = async (oldName: string, newName: string) => {
    const itemsToUpdate = menuItems.filter(item => item.category === oldName);
    for (const item of itemsToUpdate) await updateMenuItem(item.id, { category: newName });
    refetch();
    if (activeCategory === oldName) setActiveCategory(newName);
    toast.success(`تم تحديث اسم القسم إلى "${newName}"`);
  };

  const handleDeleteCategory = async (category: string) => {
    const itemsToDelete = menuItems.filter(item => item.category === category);
    for (const item of itemsToDelete) await deleteMenuItem(item.id);
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

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="بحث عن صنف..." className="pr-10 h-11 bg-card" />
        </div>
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-11 gap-2"><Filter className="w-4 h-4" /><span className="hidden sm:inline">فلترة</span></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>حسب التوفر</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setFilterAvailability('all')}><Check className={`w-4 h-4 ml-2 ${filterAvailability === 'all' ? 'opacity-100' : 'opacity-0'}`} />الكل</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterAvailability('available')}><Check className={`w-4 h-4 ml-2 ${filterAvailability === 'available' ? 'opacity-100' : 'opacity-0'}`} />المتوفر فقط</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterAvailability('unavailable')}><Check className={`w-4 h-4 ml-2 ${filterAvailability === 'unavailable' ? 'opacity-100' : 'opacity-0'}`} />النافذ فقط</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex rounded-xl border bg-card p-1">
            <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
              <List className="w-4 h-4" />
            </button>
          </div>

          <Button variant="outline" onClick={() => setCategoryManagementOpen(true)} className="h-11">
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Categories Tabs */}
      {categories.length > 0 && (
        <div className="relative group">
          <button onClick={() => { const c = document.getElementById('categories-scroll'); if (c) c.scrollBy({ left: -150, behavior: 'smooth' }); }}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 flex items-center justify-center bg-gradient-to-l from-transparent to-background rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
          </button>
          <button onClick={() => { const c = document.getElementById('categories-scroll'); if (c) c.scrollBy({ left: 150, behavior: 'smooth' }); }}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 flex items-center justify-center bg-gradient-to-r from-transparent to-background rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <div id="categories-scroll" className="flex gap-2 pb-2 overflow-x-auto scrollbar-hide scroll-smooth px-2" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {categories.map((category) => {
              const count = menuItems.filter((i) => i.category === category).length;
              return (
                <button key={category} onClick={() => setActiveCategory(category)}
                  className={`flex-shrink-0 px-4 py-2.5 rounded-xl font-medium text-sm transition-all whitespace-nowrap ${activeCategory === category ? 'bg-primary text-primary-foreground shadow-soft' : 'bg-card border hover:bg-muted text-foreground'}`}>
                  {category}
                  <Badge variant={activeCategory === category ? "secondary" : "outline"} className="mr-2 text-xs">{count}</Badge>
                </button>
              );
            })}
          </div>
        </div>
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
          ) : filteredItems.map((item) => (
            <GridMenuItem key={item.id} item={item} onToggleAvailability={handleToggleAvailability} onImageClick={setImageUpdateItem} onEdit={handleEditItem} onDelete={setDeleteItem} />
          ))}
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={filteredItems.map((i) => i.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2 pb-24">
              {filteredItems.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <UtensilsCrossed className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p className="text-lg font-medium">لا توجد أصناف</p>
                  <p className="text-sm">أضف صنفاً جديداً للبدء</p>
                </div>
              ) : filteredItems.map((item) => (
                <SortableMenuItem key={item.id} item={item} onToggleAvailability={handleToggleAvailability} onUpdateField={handleUpdateField} onImageClick={setImageUpdateItem} onDelete={setDeleteItem} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Floating Add Button */}
      <Button size="lg" className="fixed bottom-24 left-6 w-14 h-14 rounded-full shadow-elevated hover:scale-110 transition-transform z-50"
        onClick={() => { setEditingItem(null); setItemModalOpen(true); }}>
        <Plus className="w-7 h-7" />
      </Button>

      {/* Modals */}
      <CategoryManagementModal open={categoryManagementOpen} onClose={() => setCategoryManagementOpen(false)} categories={categories} menuItems={menuItems} onUpdateCategory={handleUpdateCategory} onDeleteCategory={handleDeleteCategory} onAddCategory={handleAddCategory} />
      <ItemModal isOpen={itemModalOpen} onClose={() => { setItemModalOpen(false); setEditingItem(null); }} onSave={handleSaveItem} categories={categories} selectedCategory={activeCategory} editItem={editingItem} />
      <ImageUpdateModal item={imageUpdateItem} isOpen={!!imageUpdateItem} onClose={() => setImageUpdateItem(null)} onUpdate={handleImageUpdate} />

      <AlertDialog open={!!deleteItem} onOpenChange={() => setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد حذف الصنف</AlertDialogTitle>
            <AlertDialogDescription>هل أنت متأكد من حذف "{deleteItem?.name}"؟ لا يمكن التراجع عن هذا الإجراء.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel disabled={deleting}>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteItem} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
