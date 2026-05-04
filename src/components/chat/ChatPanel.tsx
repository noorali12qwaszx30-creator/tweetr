import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Send, Search, Users, MessageCircle, Mic, Square, Trash2, Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useConversations, useMessages, getOrCreatePrivateConversation, ChatConversation } from '@/hooks/useChat';
import { usePresence, isOnline, PresenceUser } from '@/hooks/usePresence';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { toast } from 'sonner';

interface Props {
  onClose: () => void;
}

const ROLE_LABEL: Record<string, string> = {
  admin: 'مدير',
  cashier: 'كاشير',
  kitchen: 'مطبخ',
  delivery: 'سائق',
  field: 'ميداني',
  takeaway: 'تيك أواي',
};

export function ChatPanel({ onClose }: Props) {
  const { user } = useAuth();
  const { conversations } = useConversations();
  const presence = usePresence();
  const [tab, setTab] = useState<'chats' | 'people'>('chats');
  const [activeConv, setActiveConv] = useState<ChatConversation | null>(null);
  const [search, setSearch] = useState('');
  const [allUsers, setAllUsers] = useState<PresenceUser[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, username, is_active')
        .eq('is_active', true);
      const { data: roles } = await supabase.from('user_roles').select('user_id, role');
      const roleMap = new Map((roles ?? []).map((r: any) => [r.user_id, r.role]));
      const list: PresenceUser[] = (profiles ?? [])
        .filter((p: any) => p.user_id !== user.id)
        .map((p: any) => ({
          user_id: p.user_id,
          user_name: p.full_name || p.username || 'مستخدم',
          user_role: roleMap.get(p.user_id) ?? null,
          status: 'offline',
          last_seen_at: new Date(0).toISOString(),
        }));
      setAllUsers(list);
    })();
  }, [user?.id]);

  if (!user) return null;

  const presenceMap = new Map(presence.map((p) => [p.user_id, p]));
  const merged: PresenceUser[] = allUsers.map((u) => presenceMap.get(u.user_id) ?? u);
  const filteredPeople = merged
    .filter((p) => p.user_name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const ao = isOnline(a) ? 0 : 1;
      const bo = isOnline(b) ? 0 : 1;
      if (ao !== bo) return ao - bo;
      return a.user_name.localeCompare(b.user_name, 'ar');
    });

  const openPrivate = async (peer: PresenceUser) => {
    const id = await getOrCreatePrivateConversation(user.id, peer.user_id);
    setActiveConv({
      id,
      type: 'private',
      name: null,
      role_filter: null,
      last_message_at: new Date().toISOString(),
      other_user_id: peer.user_id,
      other_user_name: peer.user_name,
    });
  };

  return (
    <div className="fixed inset-x-0 bottom-0 sm:bottom-20 sm:left-4 sm:right-auto sm:w-[380px] z-[55] bg-card border border-border rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col h-[80dvh] sm:h-[600px] max-h-[90dvh]">
      {activeConv ? (
        <ConversationView conv={activeConv} onBack={() => setActiveConv(null)} />
      ) : (
        <>
          <div className="flex items-center justify-between p-3 border-b border-border">
            <h3 className="font-bold text-foreground">المحادثات</h3>
            <Button variant="ghost" size="sm" onClick={onClose}>إغلاق</Button>
          </div>
          <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="flex-1 flex flex-col min-h-0">
            <TabsList className="grid grid-cols-2 mx-3 mt-2">
              <TabsTrigger value="chats"><MessageCircle className="w-4 h-4 ml-1" />المحادثات</TabsTrigger>
              <TabsTrigger value="people"><Users className="w-4 h-4 ml-1" />المستخدمون</TabsTrigger>
            </TabsList>

            <TabsContent value="chats" className="flex-1 m-0 overflow-hidden">
              <ScrollArea className="h-full">
                {conversations.length === 0 ? (
                  <p className="p-6 text-center text-muted-foreground text-sm">لا توجد محادثات. ابدأ من تبويب المستخدمون.</p>
                ) : (
                  conversations.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setActiveConv(c)}
                      className="w-full text-right p-3 hover:bg-muted/50 border-b border-border flex items-center gap-3"
                    >
                      <div className={cn(
                        'w-10 h-10 rounded-full flex items-center justify-center text-white shrink-0',
                        c.type === 'role_group' ? 'bg-primary' : 'bg-secondary',
                      )}>
                        {c.type === 'role_group' ? <Users className="w-5 h-5" /> : <MessageCircle className="w-5 h-5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-foreground truncate">
                            {c.type === 'private' ? c.other_user_name : c.name}
                          </span>
                          {(c.unread_count ?? 0) > 0 && (
                            <span className="bg-primary text-primary-foreground text-xs rounded-full min-w-[20px] h-5 px-1 flex items-center justify-center">
                              {c.unread_count}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {formatDistanceToNow(new Date(c.last_message_at), { addSuffix: true, locale: ar })}
                        </p>
                      </div>
                    </button>
                  ))
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="people" className="flex-1 m-0 overflow-hidden flex flex-col">
              <div className="p-2 relative">
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="بحث عن مستخدم..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pr-9"
                />
              </div>
              <ScrollArea className="flex-1">
                {filteredPeople.length === 0 ? (
                  <p className="p-6 text-center text-muted-foreground text-sm">لا يوجد مستخدمون</p>
                ) : (
                  filteredPeople.map((p) => (
                    <button
                      key={p.user_id}
                      onClick={() => openPrivate(p)}
                      className="w-full text-right flex items-center gap-3 p-3 border-b border-border hover:bg-muted/50"
                    >
                      <div className="relative">
                        <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground font-bold">
                          {p.user_name.charAt(0)}
                        </div>
                        <span className={cn(
                          'absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-card',
                          isOnline(p) ? 'bg-green-500' : 'bg-gray-400',
                        )} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">{p.user_name}</p>
                        <p className="text-xs text-muted-foreground">{p.user_role ? ROLE_LABEL[p.user_role] : ''}</p>
                      </div>
                    </button>
                  ))
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}

function ConversationView({ conv, onBack }: { conv: ChatConversation; onBack: () => void }) {
  const { user } = useAuth();
  const { messages, sendMessage } = useMessages(conv.id);
  const [input, setInput] = useState('');
  const [recording, setRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const [uploading, setUploading] = useState(false);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const cancelRef = useRef(false);
  const title = conv.type === 'private' ? conv.other_user_name : conv.name;

  useEffect(() => {
    const el = document.getElementById('chat-bottom');
    el?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = input.trim();
    if (!v) return;
    setInput('');
    await sendMessage(v);
  };

  const startRecording = async () => {
    if (!user) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      cancelRef.current = false;
      mr.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (cancelRef.current) return;
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        if (blob.size < 500) return;
        setUploading(true);
        try {
          const path = `${user.id}/${Date.now()}.webm`;
          const { error: upErr } = await supabase.storage.from('chat-voice').upload(path, blob, {
            contentType: 'audio/webm',
            upsert: false,
          });
          if (upErr) throw upErr;
          const { data } = supabase.storage.from('chat-voice').getPublicUrl(path);
          await sendMessage(data.publicUrl, 'voice');
        } catch (err: any) {
          toast.error('فشل إرسال الرسالة الصوتية');
        } finally {
          setUploading(false);
        }
      };
      mediaRef.current = mr;
      mr.start();
      setRecording(true);
      setRecordTime(0);
      timerRef.current = setInterval(() => setRecordTime((t) => t + 1), 1000);
    } catch {
      toast.error('تعذّر الوصول للميكروفون');
    }
  };

  const stopRecording = (cancel = false) => {
    cancelRef.current = cancel;
    clearInterval(timerRef.current);
    setRecording(false);
    setRecordTime(0);
    mediaRef.current?.stop();
  };

  return (
    <>
      <div className="flex items-center gap-2 p-3 border-b border-border">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 rotate-180" />
        </Button>
        <div className="flex-1">
          <p className="font-bold text-foreground">{title}</p>
        </div>
      </div>
      <ScrollArea className="flex-1 p-3">
        <div className="space-y-2">
          {messages.map((m) => {
            const mine = m.sender_id === user?.id;
            return (
              <div key={m.id} className={cn('flex flex-col', mine ? 'items-end' : 'items-start')}>
                {!mine && conv.type !== 'private' && (
                  <span className="text-[10px] text-muted-foreground px-2">{m.sender_name}</span>
                )}
                <div className={cn(
                  'max-w-[85%] rounded-2xl px-3 py-2 text-sm break-words',
                  mine ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground',
                )}>
                  {m.message_type === 'voice' ? (
                    <VoicePlayer url={m.content} mine={mine} />
                  ) : (
                    m.content
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground px-2 mt-0.5">
                  {new Date(m.created_at).toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            );
          })}
          <div id="chat-bottom" />
        </div>
      </ScrollArea>
      {recording ? (
        <div className="p-2 border-t border-border flex items-center gap-2 bg-muted/30">
          <Button type="button" size="icon" variant="ghost" onClick={() => stopRecording(true)} aria-label="إلغاء">
            <Trash2 className="w-4 h-4 text-destructive" />
          </Button>
          <div className="flex-1 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-sm font-mono">
              {Math.floor(recordTime / 60)}:{String(recordTime % 60).padStart(2, '0')}
            </span>
            <span className="text-xs text-muted-foreground">جارٍ التسجيل...</span>
          </div>
          <Button type="button" size="icon" onClick={() => stopRecording(false)} aria-label="إرسال">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="p-2 border-t border-border flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={uploading ? 'جارٍ الإرسال...' : 'اكتب رسالة...'}
            className="flex-1"
            disabled={uploading}
          />
          {input.trim() ? (
            <Button type="submit" size="icon" disabled={uploading}>
              <Send className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              type="button"
              size="icon"
              onClick={startRecording}
              disabled={uploading}
              aria-label="رسالة صوتية"
            >
              <Mic className="w-4 h-4" />
            </Button>
          )}
        </form>
      )}
    </>
  );
}

function VoicePlayer({ url, mine }: { url: string; mine: boolean }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) {
      a.play();
      setPlaying(true);
    } else {
      a.pause();
      setPlaying(false);
    }
  };

  const fmt = (s: number) =>
    isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}` : '0:00';

  return (
    <div className="flex items-center gap-2 min-w-[180px]">
      <button
        type="button"
        onClick={toggle}
        className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
          mine ? 'bg-primary-foreground/20' : 'bg-foreground/10',
        )}
      >
        {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
      </button>
      <div className="flex-1">
        <div className={cn('h-1 rounded-full', mine ? 'bg-primary-foreground/30' : 'bg-foreground/20')}>
          <div
            className={cn('h-full rounded-full', mine ? 'bg-primary-foreground' : 'bg-foreground/60')}
            style={{ width: duration ? `${(current / duration) * 100}%` : '0%' }}
          />
        </div>
        <span className="text-[10px] opacity-80">{fmt(current)} / {fmt(duration)}</span>
      </div>
      <audio
        ref={audioRef}
        src={url}
        preload="metadata"
        onLoadedMetadata={(e) => setDuration((e.target as HTMLAudioElement).duration)}
        onTimeUpdate={(e) => setCurrent((e.target as HTMLAudioElement).currentTime)}
        onEnded={() => setPlaying(false)}
      />
    </div>
  );
}