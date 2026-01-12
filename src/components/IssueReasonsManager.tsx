import { useState } from 'react';
import { useIssueReasons } from '@/contexts/IssueReasonsContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Edit, Check, X, AlertTriangle, Loader2 } from 'lucide-react';

export function IssueReasonsManager() {
  const { reasons, loading, addReason, updateReason, removeReason } = useIssueReasons();
  const [newReason, setNewReason] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleAdd = async () => {
    if (!newReason.trim()) return;
    setIsAdding(true);
    await addReason(newReason.trim());
    setNewReason('');
    setIsAdding(false);
  };

  const handleEdit = (id: string, label: string) => {
    setEditingId(id);
    setEditingText(label);
  };

  const handleSaveEdit = async () => {
    if (!editingText.trim() || !editingId) return;
    await updateReason(editingId, editingText.trim());
    setEditingId(null);
    setEditingText('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingText('');
  };

  const handleDelete = async (id: string) => {
    await removeReason(id);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="font-bold text-lg flex items-center gap-2">
        <AlertTriangle className="w-5 h-5 text-warning" />
        إدارة أسباب التبليغ
      </h3>
      
      {/* Add new reason */}
      <div className="flex gap-2">
        <Input
          placeholder="أدخل سبب تبليغ جديد..."
          value={newReason}
          onChange={(e) => setNewReason(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        />
        <Button onClick={handleAdd} disabled={isAdding || !newReason.trim()}>
          {isAdding ? (
            <Loader2 className="w-4 h-4 ml-1 animate-spin" />
          ) : (
            <Plus className="w-4 h-4 ml-1" />
          )}
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
                <span className="flex-1">{reason.label}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleEdit(reason.id, reason.label)}
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
        <p className="text-muted-foreground text-center py-4">لا توجد أسباب تبليغ</p>
      )}
    </div>
  );
}
