import { useState } from 'react';
import { useCancellationReasons } from '@/contexts/CancellationReasonsContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Edit, Check, X } from 'lucide-react';
import { toast } from 'sonner';

export function CancellationReasonsManager() {
  const { reasons, addReason, updateReason, deleteReason } = useCancellationReasons();
  const [newReason, setNewReason] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  const handleAdd = () => {
    if (!newReason.trim()) {
      toast.error('يرجى إدخال سبب الإلغاء');
      return;
    }
    addReason(newReason.trim());
    setNewReason('');
    toast.success('تم إضافة سبب الإلغاء');
  };

  const handleEdit = (id: string, text: string) => {
    setEditingId(id);
    setEditingText(text);
  };

  const handleSaveEdit = () => {
    if (!editingText.trim()) {
      toast.error('يرجى إدخال سبب الإلغاء');
      return;
    }
    if (editingId) {
      updateReason(editingId, editingText.trim());
      setEditingId(null);
      setEditingText('');
      toast.success('تم تحديث سبب الإلغاء');
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingText('');
  };

  const handleDelete = (id: string) => {
    deleteReason(id);
    toast.success('تم حذف سبب الإلغاء');
  };

  return (
    <div className="space-y-4">
      <h3 className="font-bold text-lg">إدارة أسباب الإلغاء</h3>
      
      {/* Add new reason */}
      <div className="flex gap-2">
        <Input
          placeholder="أدخل سبب إلغاء جديد..."
          value={newReason}
          onChange={(e) => setNewReason(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        />
        <Button onClick={handleAdd}>
          <Plus className="w-4 h-4 ml-1" />
          إضافة
        </Button>
      </div>

      {/* Reasons list */}
      <div className="space-y-2">
        {reasons.map(reason => (
          <div
            key={reason.id}
            className="flex items-center gap-2 p-3 bg-card border border-border rounded-lg"
          >
            {editingId === reason.id ? (
              <>
                <Input
                  value={editingText}
                  onChange={(e) => setEditingText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
                  className="flex-1"
                  autoFocus
                />
                <Button variant="ghost" size="icon" onClick={handleSaveEdit}>
                  <Check className="w-4 h-4 text-success" />
                </Button>
                <Button variant="ghost" size="icon" onClick={handleCancelEdit}>
                  <X className="w-4 h-4 text-destructive" />
                </Button>
              </>
            ) : (
              <>
                <span className="flex-1">{reason.text}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleEdit(reason.id, reason.text)}
                >
                  <Edit className="w-4 h-4 text-muted-foreground" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(reason.id)}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </>
            )}
          </div>
        ))}
      </div>

      {reasons.length === 0 && (
        <p className="text-muted-foreground text-center py-4">لا توجد أسباب إلغاء</p>
      )}
    </div>
  );
}
