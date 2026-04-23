import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAreaNotes } from '@/hooks/useAreaNotes';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, MessageSquarePlus, Trash2, Loader2, AlertTriangle, Info, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';

interface Props {
  areaId: string;
  areaName: string;
}

const severityConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  info: { label: 'معلومة', icon: <Info className="w-3 h-3" />, color: 'text-info' },
  warning: { label: 'تحذير', icon: <AlertTriangle className="w-3 h-3" />, color: 'text-warning' },
  critical: { label: 'حرج', icon: <AlertCircle className="w-3 h-3" />, color: 'text-destructive' },
};

export function AreaNotesPanel({ areaId, areaName }: Props) {
  const { user } = useAuth();
  const { notes, loading, addNote, deleteNote } = useAreaNotes(areaId);
  const [newNote, setNewNote] = useState('');
  const [severity, setSeverity] = useState('info');
  const [submitting, setSubmitting] = useState(false);

  const handleAdd = async () => {
    if (!newNote.trim()) {
      toast.error('اكتب ملاحظة أولاً');
      return;
    }
    setSubmitting(true);
    const name = user?.fullName || user?.username || 'سائق';
    const result = await addNote(areaId, areaName, newNote.trim(), severity, name);
    setSubmitting(false);
    if (result.success) {
      setNewNote('');
      setSeverity('info');
      toast.success('تمت إضافة الملاحظة');
    } else {
      toast.error('فشل إضافة الملاحظة');
    }
  };

  return (
    <div className="bg-muted/30 rounded-2xl p-3 border border-border/50">
      <div className="flex items-center gap-2 mb-2">
        <MapPin className="w-4 h-4 text-primary" />
        <h4 className="font-bold text-sm">ملاحظات منطقة {areaName}</h4>
        <span className="text-xs text-muted-foreground">({notes.length})</span>
      </div>

      {loading ? (
        <div className="flex justify-center py-3">
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        </div>
      ) : notes.length === 0 ? (
        <p className="text-xs text-muted-foreground py-2">لا توجد ملاحظات عن هذه المنطقة بعد.</p>
      ) : (
        <div className="space-y-2 max-h-48 overflow-y-auto mb-2">
          {notes.map((n) => {
            const cfg = severityConfig[n.severity] || severityConfig.info;
            return (
              <div key={n.id} className="bg-card rounded-lg p-2 border border-border/30 text-xs">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-1 flex-1">
                    <span className={cfg.color}>{cfg.icon}</span>
                    <p className="flex-1 leading-relaxed">{n.note}</p>
                  </div>
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
            );
          })}
        </div>
      )}

      <div className="space-y-2">
        <div className="flex gap-2">
          <Select value={severity} onValueChange={setSeverity}>
            <SelectTrigger className="w-28 h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="info">معلومة</SelectItem>
              <SelectItem value="warning">تحذير</SelectItem>
              <SelectItem value="critical">حرج</SelectItem>
            </SelectContent>
          </Select>
          <Textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="مثال: ازدحام شديد وقت الغداء، شارع مغلق للصيانة..."
            rows={2}
            className="text-xs resize-none flex-1"
          />
          <Button size="sm" onClick={handleAdd} disabled={submitting} className="self-end">
            {submitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <MessageSquarePlus className="w-3 h-3" />}
          </Button>
        </div>
      </div>
    </div>
  );
}