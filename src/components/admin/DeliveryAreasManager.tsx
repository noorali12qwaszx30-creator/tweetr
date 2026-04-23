import { useState } from 'react';
import { useDeliveryAreas, DeliveryArea } from '@/hooks/useDeliveryAreas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { formatNumberWithCommas, toEnglishNumbers } from '@/lib/formatNumber';
import {
  Plus,
  Trash2,
  MapPin,
  Edit2,
  Check,
  X,
  Loader2,
  Package,
  DollarSign,
  ArrowUpDown,
  Info
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
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { SortableAreaItem } from '@/components/delivery/SortableAreaItem';
import { supabase } from '@/integrations/supabase/client';

export function DeliveryAreasManager() {
  const { areas, loading, addArea, updateArea, deleteArea } = useDeliveryAreas();
  const [newAreaName, setNewAreaName] = useState('');
  const [newAreaFee, setNewAreaFee] = useState('');
  const [editingArea, setEditingArea] = useState<DeliveryArea | null>(null);
  const [editName, setEditName] = useState('');
  const [editFee, setEditFee] = useState('');
  const [deletingArea, setDeletingArea] = useState<DeliveryArea | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [reorderMode, setReorderMode] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = areas.findIndex((a) => a.id === active.id);
    const newIndex = areas.findIndex((a) => a.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(areas, oldIndex, newIndex);

    // Update display_order in DB for all reordered items
    try {
      const updates = reordered.map((a, idx) =>
        supabase.from('delivery_areas').update({ display_order: idx }).eq('id', a.id)
      );
      await Promise.all(updates);
      // Refresh local state via hook update calls
      reordered.forEach((a, idx) => {
        if (a.display_order !== idx) {
          updateArea(a.id, { display_order: idx });
        }
      });
      toast.success('تم تحديث ترتيب المناطق');
    } catch (err) {
      console.error(err);
      toast.error('فشل تحديث الترتيب');
    }
  };

  const handleAddArea = async () => {
    if (!newAreaName.trim()) {
      toast.error('الرجاء إدخال اسم المنطقة');
      return;
    }

    const fee = parseFloat(newAreaFee) || 0;
    if (fee < 0) {
      toast.error('سعر التوصيل يجب أن يكون صفر أو أكثر');
      return;
    }

    setSubmitting(true);
    const result = await addArea(newAreaName.trim(), fee);
    setSubmitting(false);

    if (result.success) {
      toast.success('تمت إضافة المنطقة بنجاح');
      setNewAreaName('');
      setNewAreaFee('');
    } else {
      toast.error(result.error?.includes('duplicate') ? 'هذه المنطقة موجودة مسبقاً' : 'حدث خطأ في إضافة المنطقة');
    }
  };

  const handleStartEdit = (area: DeliveryArea) => {
    setEditingArea(area);
    setEditName(area.name);
    setEditFee(area.delivery_fee.toString());
  };

  const handleSaveEdit = async () => {
    if (!editingArea || !editName.trim()) return;

    const fee = parseFloat(editFee) || 0;
    if (fee < 0) {
      toast.error('سعر التوصيل يجب أن يكون صفر أو أكثر');
      return;
    }

    setSubmitting(true);
    const result = await updateArea(editingArea.id, { name: editName.trim(), delivery_fee: fee });
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
      {/* Hint about ordering */}
      <div className="bg-info/10 border border-info/30 rounded-xl p-3 flex gap-2 text-xs">
        <Info className="w-4 h-4 text-info shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-info">ترتيب المناطق حسب القرب الجغرافي</p>
          <p className="text-muted-foreground">
            رتّب المناطق من الأقرب إلى الأبعد. السائقون سيرون طلباتهم مرتّبة تلقائياً وفق هذا الترتيب لتسهيل تخطيط المسار.
          </p>
        </div>
      </div>

      {/* Add New Area */}
      <div className="bg-card border border-border rounded-xl p-4 shadow-soft">
        <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
          <Plus className="w-4 h-4 text-primary" />
          إضافة منطقة جديدة
        </h3>
        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            <Input
              placeholder="اسم المنطقة (مثال: حي الجامعة)"
              value={newAreaName}
              onChange={(e) => setNewAreaName(e.target.value)}
              className="flex-1"
            />
          </div>
          <div className="flex gap-2 items-center">
            <div className="relative flex-1">
              <DollarSign className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="number"
                placeholder="سعر التوصيل (د.ع)"
                value={newAreaFee}
                onChange={(e) => setNewAreaFee(e.target.value)}
                className="pr-9"
                min="0"
              />
            </div>
            <Button onClick={handleAddArea} disabled={submitting}>
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              <span className="mr-1">إضافة</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Areas List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            قائمة المناطق ({toEnglishNumbers(areas.length)})
          </h3>
          {areas.length > 1 && (
            <Button
              variant={reorderMode ? 'default' : 'outline'}
              size="sm"
              onClick={() => setReorderMode(!reorderMode)}
            >
              <ArrowUpDown className="w-3 h-3 ml-1" />
              {reorderMode ? 'إنهاء الترتيب' : 'إعادة الترتيب'}
            </Button>
          )}
        </div>

        {areas.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MapPin className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>لا توجد مناطق محددة</p>
            <p className="text-sm">أضف مناطق التوصيل لتظهر للكاشير</p>
          </div>
        ) : reorderMode ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={areas.map((a) => a.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {areas.map((area, idx) => (
                  <SortableAreaItem
                    key={area.id}
                    area={area}
                    position={idx + 1}
                    onEdit={handleStartEdit}
                    onDelete={setDeletingArea}
                    onToggle={handleToggleActive}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        ) : (
          areas.map(area => (
            <div
              key={area.id}
              className={`bg-card border rounded-xl p-3 shadow-soft transition-all ${
                area.is_active ? 'border-border' : 'border-muted opacity-60'
              }`}
            >
              {editingArea?.id === area.id ? (
                <div className="space-y-2">
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="اسم المنطقة"
                    autoFocus
                  />
                  <div className="flex gap-2 items-center">
                    <div className="relative flex-1">
                      <DollarSign className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        type="number"
                        value={editFee}
                        onChange={(e) => setEditFee(e.target.value)}
                        placeholder="سعر التوصيل"
                        className="pr-9"
                        min="0"
                      />
                    </div>
                    <Button size="icon" variant="ghost" onClick={handleSaveEdit} disabled={submitting}>
                      <Check className="w-4 h-4 text-success" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => setEditingArea(null)}>
                      <X className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <MapPin className={`w-5 h-5 ${area.is_active ? 'text-primary' : 'text-muted-foreground'}`} />
                    <div>
                      <p className="font-semibold text-sm">{area.name}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Package className="w-3 h-3" />
                          {toEnglishNumbers(area.order_count)} طلب
                        </span>
                        <span className="flex items-center gap-1 text-primary font-medium">
                          <DollarSign className="w-3 h-3" />
                          {formatNumberWithCommas(area.delivery_fee)} د.ع
                        </span>
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