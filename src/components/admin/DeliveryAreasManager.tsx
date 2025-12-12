import { useState } from 'react';
import { useDeliveryAreas, DeliveryArea } from '@/hooks/useDeliveryAreas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import {
  Plus,
  Trash2,
  MapPin,
  Edit2,
  Check,
  X,
  Loader2,
  Package
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

export function DeliveryAreasManager() {
  const { areas, loading, addArea, updateArea, deleteArea } = useDeliveryAreas();
  const [newAreaName, setNewAreaName] = useState('');
  const [editingArea, setEditingArea] = useState<DeliveryArea | null>(null);
  const [editName, setEditName] = useState('');
  const [deletingArea, setDeletingArea] = useState<DeliveryArea | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleAddArea = async () => {
    if (!newAreaName.trim()) {
      toast.error('الرجاء إدخال اسم المنطقة');
      return;
    }

    setSubmitting(true);
    const result = await addArea(newAreaName.trim());
    setSubmitting(false);

    if (result.success) {
      toast.success('تمت إضافة المنطقة بنجاح');
      setNewAreaName('');
    } else {
      toast.error(result.error?.includes('duplicate') ? 'هذه المنطقة موجودة مسبقاً' : 'حدث خطأ في إضافة المنطقة');
    }
  };

  const handleStartEdit = (area: DeliveryArea) => {
    setEditingArea(area);
    setEditName(area.name);
  };

  const handleSaveEdit = async () => {
    if (!editingArea || !editName.trim()) return;

    setSubmitting(true);
    const result = await updateArea(editingArea.id, { name: editName.trim() });
    setSubmitting(false);

    if (result.success) {
      toast.success('تم تحديث المنطقة بنجاح');
      setEditingArea(null);
    } else {
      toast.error('حدث خطأ في تحديث المنطقة');
    }
  };

  const handleToggleActive = async (area: DeliveryArea) => {
    const result = await updateArea(area.id, { is_active: !area.is_active });
    if (result.success) {
      toast.success(area.is_active ? 'تم إلغاء تفعيل المنطقة' : 'تم تفعيل المنطقة');
    } else {
      toast.error('حدث خطأ في تحديث المنطقة');
    }
  };

  const handleDeleteArea = async () => {
    if (!deletingArea) return;

    setSubmitting(true);
    const result = await deleteArea(deletingArea.id);
    setSubmitting(false);

    if (result.success) {
      toast.success('تم حذف المنطقة بنجاح');
      setDeletingArea(null);
    } else {
      toast.error('حدث خطأ في حذف المنطقة');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Add New Area */}
      <div className="bg-card border border-border rounded-xl p-4 shadow-soft">
        <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
          <Plus className="w-4 h-4 text-primary" />
          إضافة منطقة جديدة
        </h3>
        <div className="flex gap-2">
          <Input
            placeholder="اسم المنطقة (مثال: حي الجامعة)"
            value={newAreaName}
            onChange={(e) => setNewAreaName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddArea()}
            className="flex-1"
          />
          <Button onClick={handleAddArea} disabled={submitting}>
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Areas List */}
      <div className="space-y-2">
        <h3 className="font-bold text-sm flex items-center gap-2">
          <MapPin className="w-4 h-4 text-primary" />
          قائمة المناطق ({areas.length})
        </h3>

        {areas.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MapPin className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>لا توجد مناطق محددة</p>
            <p className="text-sm">أضف مناطق التوصيل لتظهر للكاشير</p>
          </div>
        ) : (
          areas.map(area => (
            <div
              key={area.id}
              className={`bg-card border rounded-xl p-3 shadow-soft transition-all ${
                area.is_active ? 'border-border' : 'border-muted opacity-60'
              }`}
            >
              {editingArea?.id === area.id ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
                    autoFocus
                    className="flex-1"
                  />
                  <Button size="icon" variant="ghost" onClick={handleSaveEdit} disabled={submitting}>
                    <Check className="w-4 h-4 text-success" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => setEditingArea(null)}>
                    <X className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <MapPin className={`w-5 h-5 ${area.is_active ? 'text-primary' : 'text-muted-foreground'}`} />
                    <div>
                      <p className="font-semibold text-sm">{area.name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Package className="w-3 h-3" />
                        <span>{area.order_count} طلب</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      checked={area.is_active}
                      onCheckedChange={() => handleToggleActive(area)}
                    />
                    <Button size="icon" variant="ghost" onClick={() => handleStartEdit(area)}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeletingArea(area)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingArea} onOpenChange={() => setDeletingArea(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف المنطقة</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف منطقة "{deletingArea?.name}"؟
              <br />
              <span className="text-destructive">تحذير: هذه المنطقة لديها {deletingArea?.order_count} طلب مسجل</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteArea}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
