import { useState } from 'react';
import { MenuItem } from '@/hooks/useMenuItems';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Settings, FolderPlus, Edit3, Trash2, Package, Loader2 } from 'lucide-react';

interface CategoryManagementModalProps {
  open: boolean;
  onClose: () => void;
  categories: string[];
  menuItems: MenuItem[];
  onUpdateCategory: (oldName: string, newName: string) => Promise<void>;
  onDeleteCategory: (category: string) => Promise<void>;
  onAddCategory: (name: string) => void;
}

export function CategoryManagementModal({
  open, onClose, categories, menuItems, onUpdateCategory, onDeleteCategory, onAddCategory,
}: CategoryManagementModalProps) {
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [loading, setLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const getCategoryItemCount = (category: string) => menuItems.filter(item => item.category === category).length;

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
            <DialogTitle className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10">
                <Settings className="w-5 h-5 text-primary" />
              </div>
              إدارة الأقسام
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex gap-2 p-3 bg-muted/30 rounded-xl border border-dashed border-border">
              <Input
                placeholder="اسم القسم الجديد..."
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                className="flex-1 bg-background"
              />
              <Button onClick={handleAddCategory} disabled={!newCategoryName.trim()} size="sm" className="bg-primary hover:bg-primary/90">
                <FolderPlus className="w-4 h-4 ml-1" />
                إضافة
              </Button>
            </div>

            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {categories.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="w-12 h-12 mx-auto mb-4 opacity-30" />
                    <p>لا توجد أقسام</p>
                  </div>
                ) : (
                  categories.map((category, index) => (
                    <div key={category} className="flex items-center gap-3 p-3 bg-card rounded-xl border shadow-soft hover:shadow-elevated transition-all group">
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary font-bold text-sm">
                        {index + 1}
                      </div>
                      {editingCategory === category ? (
                        <Input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleEditSave(); if (e.key === 'Escape') setEditingCategory(null); }}
                          onBlur={handleEditSave}
                          autoFocus
                          className="flex-1 h-8"
                          disabled={loading}
                        />
                      ) : (
                        <>
                          <span className="flex-1 font-semibold text-foreground">{category}</span>
                          <Badge variant="secondary" className="font-medium">{getCategoryItemCount(category)} صنف</Badge>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleEditStart(category)} className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors" title="تعديل">
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button onClick={() => setDeleteConfirm(category)} className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors" title="حذف">
                              <Trash2 className="w-4 h-4" />
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

      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد حذف القسم</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف قسم "{deleteConfirm}"?
              <br />
              <span className="text-destructive font-medium">
                سيتم حذف جميع الأصناف ({getCategoryItemCount(deleteConfirm || '')}) في هذا القسم!
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel disabled={loading}>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteConfirm && handleDelete(deleteConfirm)} disabled={loading} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {loading ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
              حذف القسم والأصناف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
