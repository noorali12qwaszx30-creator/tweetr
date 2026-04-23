import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useDriverPersonalNotes } from '@/hooks/useDriverPersonalNotes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, BookOpen, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';

export function PersonalNotesTab() {
  const { user } = useAuth();
  const { notes, loading, addNote, deleteNote } = useDriverPersonalNotes(user?.id);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleAdd = async () => {
    if (!content.trim()) {
      toast.error('اكتب محتوى الملاحظة');
      return;
    }
    setSubmitting(true);
    const result = await addNote(content.trim(), title.trim() || undefined);
    setSubmitting(false);
    if (result.success) {
      setTitle('');
      setContent('');
      setShowForm(false);
      toast.success('تم حفظ الملاحظة');
    } else {
      toast.error('فشل حفظ الملاحظة');
    }
  };

  const handleDelete = async (id: string) => {
    const result = await deleteNote(id);
    if (result.success) toast.success('تم حذف الملاحظة');
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary" />
          دفتر ملاحظاتي
        </h2>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          <span className="mr-1">{showForm ? 'إلغاء' : 'ملاحظة جديدة'}</span>
        </Button>
      </div>

      {showForm && (
        <div className="bg-card border border-border rounded-xl p-3 shadow-soft space-y-2">
          <Input
            placeholder="عنوان (اختياري)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Textarea
            placeholder="اكتب ملاحظتك هنا..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            autoFocus
          />
          <div className="flex justify-end">
            <Button size="sm" onClick={handleAdd} disabled={submitting}>
              {submitting ? <Loader2 className="w-4 h-4 animate-spin ml-1" /> : null}
              حفظ
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : notes.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>لا توجد ملاحظات بعد</p>
          <p className="text-xs">سجّل أي معلومة مفيدة لك (طرق مختصرة، عناوين صعبة، إلخ)</p>
        </div>
      ) : (
        <div className="grid gap-2">
          {notes.map((n) => (
            <div key={n.id} className="bg-card border border-border rounded-xl p-3 shadow-soft">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  {n.title && <h3 className="font-bold text-sm mb-1">{n.title}</h3>}
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{n.content}</p>
                  <p className="text-[10px] text-muted-foreground mt-2">
                    {formatDistanceToNow(new Date(n.updated_at), { addSuffix: true, locale: ar })}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(n.id)}
                  className="text-destructive opacity-60 hover:opacity-100"
                  aria-label="حذف"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}