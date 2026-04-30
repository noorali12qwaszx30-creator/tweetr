import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bell, Send, Clock, Loader2, Trash2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { ROLE_LABELS, UserRole } from '@/types';

const ALL_ROLES: UserRole[] = ['cashier', 'kitchen', 'delivery', 'field', 'takeaway', 'admin'];

interface ScheduledNotification {
  id: string;
  title: string;
  body: string | null;
  target_roles: string[];
  scheduled_at: string;
  status: string;
  sent_at: string | null;
  sent_count: number | null;
  error_message: string | null;
  created_by_name: string | null;
  created_at: string;
}

function localDatetimeNowPlus(minutes: number): string {
  const d = new Date(Date.now() + minutes * 60_000);
  // format YYYY-MM-DDTHH:mm in local time
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function NotificationsManager() {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [targets, setTargets] = useState<UserRole[]>(['cashier', 'kitchen', 'delivery', 'field', 'takeaway']);
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduledAt, setScheduledAt] = useState<string>(localDatetimeNowPlus(15));
  const [sending, setSending] = useState(false);
  const [list, setList] = useState<ScheduledNotification[]>([]);
  const [loadingList, setLoadingList] = useState(false);

  const toggleRole = (r: UserRole) => {
    setTargets((prev) =>
      prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r],
    );
  };

  const loadList = async () => {
    setLoadingList(true);
    const { data, error } = await supabase
      .from('scheduled_notifications' as any)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    if (!error && data) setList(data as unknown as ScheduledNotification[]);
    setLoadingList(false);
  };

  useEffect(() => {
    loadList();
  }, []);

  const handleSend = async () => {
    if (!title.trim()) {
      toast.error('العنوان مطلوب');
      return;
    }
    if (targets.length === 0) {
      toast.error('اختر الأدوار المستهدفة');
      return;
    }

    setSending(true);
    try {
      if (scheduleEnabled) {
        const when = new Date(scheduledAt);
        if (isNaN(when.getTime())) {
          toast.error('وقت الجدولة غير صالح');
          setSending(false);
          return;
        }
        if (when.getTime() < Date.now() - 30_000) {
          toast.error('وقت الجدولة في الماضي');
          setSending(false);
          return;
        }
        const { error } = await supabase.from('scheduled_notifications' as any).insert({
          title: title.trim(),
          body: body.trim() || null,
          target_roles: targets,
          scheduled_at: when.toISOString(),
          status: 'pending',
          created_by: user?.id,
          created_by_name: user?.username ?? null,
        });
        if (error) throw error;
        toast.success('تمت جدولة الإشعار ✓');
      } else {
        // Send now: also persist as a record then call dispatcher directly
        const { data: inserted, error: insErr } = await supabase
          .from('scheduled_notifications' as any)
          .insert({
            title: title.trim(),
            body: body.trim() || null,
            target_roles: targets,
            scheduled_at: new Date().toISOString(),
            status: 'pending',
            created_by: user?.id,
            created_by_name: user?.username ?? null,
          })
          .select()
          .single();
        if (insErr) throw insErr;

        const { error: dispErr } = await supabase.functions.invoke(
          'dispatch-scheduled-notifications',
          { body: { trigger: 'manual', id: (inserted as any)?.id } },
        );
        if (dispErr) throw dispErr;
        toast.success('تم إرسال الإشعار ✓');
      }

      setTitle('');
      setBody('');
      loadList();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'فشل الإرسال');
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('scheduled_notifications' as any)
      .delete()
      .eq('id', id);
    if (error) {
      toast.error('فشل الحذف');
      return;
    }
    toast.success('تم الحذف');
    loadList();
  };

  const handleCancel = async (id: string) => {
    const { error } = await supabase
      .from('scheduled_notifications' as any)
      .update({ status: 'cancelled' })
      .eq('id', id);
    if (error) {
      toast.error('فشل الإلغاء');
      return;
    }
    toast.success('تم إلغاء الجدولة');
    loadList();
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue="compose">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="compose">
            <Send className="w-4 h-4 ml-2" /> إرسال
          </TabsTrigger>
          <TabsTrigger value="list">
            <Clock className="w-4 h-4 ml-2" /> السجل والمجدولة
          </TabsTrigger>
        </TabsList>

        <TabsContent value="compose" className="space-y-4 mt-4">
          <Card className="p-4 space-y-4">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              <h3 className="font-bold">إنشاء إشعار</h3>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notif-title">العنوان</Label>
              <Input
                id="notif-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="مثال: اجتماع الموظفين الساعة 5"
                maxLength={120}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notif-body">النص (اختياري)</Label>
              <Textarea
                id="notif-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="اكتب نص الإشعار..."
                rows={3}
                maxLength={500}
              />
            </div>

            <div className="space-y-2">
              <Label>الأدوار المستهدفة</Label>
              <div className="grid grid-cols-2 gap-2">
                {ALL_ROLES.map((r) => (
                  <label
                    key={r}
                    className="flex items-center gap-2 rounded-lg border p-2 cursor-pointer hover:bg-muted/50"
                  >
                    <Checkbox
                      checked={targets.includes(r)}
                      onCheckedChange={() => toggleRole(r)}
                    />
                    <span className="text-sm font-medium">{ROLE_LABELS[r]}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2 border-t pt-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={scheduleEnabled}
                  onCheckedChange={(c) => setScheduleEnabled(!!c)}
                />
                <Clock className="w-4 h-4" />
                <span className="text-sm font-medium">جدولة لوقت محدد</span>
              </label>
              {scheduleEnabled && (
                <Input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                />
              )}
            </div>

            <Button onClick={handleSend} disabled={sending} className="w-full" size="lg">
              {sending ? (
                <Loader2 className="w-4 h-4 ml-2 animate-spin" />
              ) : scheduleEnabled ? (
                <Clock className="w-4 h-4 ml-2" />
              ) : (
                <Send className="w-4 h-4 ml-2" />
              )}
              {scheduleEnabled ? 'جدولة الإشعار' : 'إرسال الآن'}
            </Button>
          </Card>
        </TabsContent>

        <TabsContent value="list" className="space-y-2 mt-4">
          {loadingList ? (
            <div className="flex justify-center p-6">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : list.length === 0 ? (
            <p className="text-center text-muted-foreground p-6">لا توجد إشعارات</p>
          ) : (
            list.map((n) => (
              <Card key={n.id} className="p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate">{n.title}</p>
                    {n.body && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {n.body}
                      </p>
                    )}
                  </div>
                  <StatusBadge status={n.status} />
                </div>
                <div className="flex flex-wrap gap-1">
                  {n.target_roles.map((r) => (
                    <Badge key={r} variant="secondary" className="text-[10px]">
                      {ROLE_LABELS[r as UserRole] ?? r}
                    </Badge>
                  ))}
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {n.status === 'sent' && n.sent_at
                      ? `أُرسل: ${new Date(n.sent_at).toLocaleString('ar')}`
                      : `موعد: ${new Date(n.scheduled_at).toLocaleString('ar')}`}
                  </span>
                  {n.status === 'sent' && (
                    <span>إلى {n.sent_count ?? 0} جهاز</span>
                  )}
                </div>
                {n.error_message && (
                  <p className="text-[11px] text-destructive">{n.error_message}</p>
                )}
                <div className="flex gap-2 pt-1">
                  {n.status === 'pending' && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleCancel(n.id)}
                    >
                      إلغاء الجدولة
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive"
                    onClick={() => handleDelete(n.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'sent') {
    return (
      <Badge className="bg-success text-success-foreground gap-1">
        <CheckCircle2 className="w-3 h-3" /> أُرسل
      </Badge>
    );
  }
  if (status === 'pending') {
    return (
      <Badge variant="secondary" className="gap-1">
        <Clock className="w-3 h-3" /> مجدول
      </Badge>
    );
  }
  if (status === 'failed') {
    return (
      <Badge variant="destructive" className="gap-1">
        <XCircle className="w-3 h-3" /> فشل
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-1">
      <AlertCircle className="w-3 h-3" /> {status}
    </Badge>
  );
}