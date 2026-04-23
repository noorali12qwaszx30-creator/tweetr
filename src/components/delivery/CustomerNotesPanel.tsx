import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCustomerNotes } from '@/hooks/useCustomerNotes';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MessageSquarePlus, Trash2, Users, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';

interface Props {
  customerPhone: string;
  customerId?: string;
}

export function CustomerNotesPanel({ customerPhone, customerId }: Props) {
  const { user } = useAuth();
  const { notes, loading, addNote, deleteNote } = useCustomerNotes(customerPhone);
  const [newNote, setNewNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleAdd = async () => {
    if (!newNote.trim()) {
      toast.error('اكتب ملاحظة أولاً');
      return;
    }
    setSubmitting(true);
    const name = user?.fullName || user?.username || 'سائق';
    const result = await addNote(newNote.trim(), name, customerId);
    setSubmitting(false);
    if (result.success) {
      setNewNote('');
      toast.success('تمت إضافة الملاحظة');
    } else {
      toast.error('فشل إضافة الملاحظة');
    }
  };

  return (
    <div className="bg-muted/30 rounded-2xl p-3 border border-border/50">
      <div className="flex items-center gap-2 mb-2">
        <Users className="w-4 h-4 text-primary" />
        <h4 className="font-bold text-sm">ملاحظات السائقين عن الزبون</h4>
        <span className="text-xs text-muted-foreground">({notes.length})</span>
      </div>

      {loading ? (
        <div className="flex justify-center py-3">
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        </div>
      ) : notes.length === 0 ? (
        <p className="text-xs text-muted-foreground py-2">لا توجد ملاحظات سابقة. كن أول من يشارك معلومة مفيدة!</p>
      ) : (
        <div className="space-y-2 max-h-48 overflow-y-auto mb-2">
          {notes.map((n) => (
            <div key={n.id} className="bg-card rounded-lg p-2 border border-border/30 text-xs">
              <div className="flex items-start justify-between gap-2">
                <p className="flex-1 leading-relaxed">{n.note}</p>
                {n.created_by === user?.id && (
                  <button
                    onClick={() => deleteNote(n.id)}
                    className="text-destructive opacity-60 hover:opacity-100"
                    aria-label="حذف"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                <span className="font-medium">{n.created_by_name}</span>
                <span>•</span>
                <span>{formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ar })}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="مثال: البناية بدون مصعد، الزبون يفضل الاتصال قبل الوصول..."
          rows={2}
          className="text-xs resize-none"
        />
        <Button size="sm" onClick={handleAdd} disabled={submitting} className="self-end">
          {submitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <MessageSquarePlus className="w-3 h-3" />}
        </Button>
      </div>
    </div>
  );
}