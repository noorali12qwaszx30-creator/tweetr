import { useEffect, useState } from 'react';
import { ArrowLeft, Send, Phone, Search, Users, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useConversations, useMessages, getOrCreatePrivateConversation, ChatConversation } from '@/hooks/useChat';
import { usePresence, isOnline, PresenceUser } from '@/hooks/usePresence';
import { initiateCall } from '@/hooks/useWebRTC';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';

interface Props {
  onClose: () => void;
  onStartCall: (callId: string, peerName: string) => void;
}

const ROLE_LABEL: Record<string, string> = {
  admin: 'مدير',
  cashier: 'كاشير',
  kitchen: 'مطبخ',
  delivery: 'سائق',
  field: 'ميداني',
  takeaway: 'تيك أواي',
};

export function ChatPanel({ onClose, onStartCall }: Props) {
  const { user } = useAuth();
  const { conversations } = useConversations();
  const presence = usePresence();
  const [tab, setTab] = useState<'chats' | 'people'>('chats');
  const [activeConv, setActiveConv] = useState<ChatConversation | null>(null);
  const [search, setSearch] = useState('');

  if (!user) return null;

  const others = presence.filter((p) => p.user_id !== user.id);
  const filteredPeople = others.filter((p) => p.user_name.toLowerCase().includes(search.toLowerCase()));

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

  const callUser = async (peer: PresenceUser) => {
    const callId = await initiateCall(user.id, user.fullName || user.username, peer.user_id, peer.user_name);
    onStartCall(callId, peer.user_name);
  };

  return (
    <div className="fixed inset-x-0 bottom-0 sm:bottom-20 sm:left-4 sm:right-auto sm:w-[380px] z-[55] bg-card border border-border rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col h-[80dvh] sm:h-[600px] max-h-[90dvh]">
      {activeConv ? (
        <ConversationView
          conv={activeConv}
          onBack={() => setActiveConv(null)}
          onCall={() => {
            if (activeConv.other_user_id && activeConv.other_user_name) {
              const peer: PresenceUser = {
                user_id: activeConv.other_user_id,
                user_name: activeConv.other_user_name,
                user_role: null,
                status: 'online',
                last_seen_at: new Date().toISOString(),
              };
              callUser(peer);
            }
          }}
        />
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
                    <div key={p.user_id} className="flex items-center gap-3 p-3 border-b border-border">
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
                      <Button size="icon" variant="ghost" onClick={() => openPrivate(p)} aria-label="رسالة">
                        <MessageCircle className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => callUser(p)} aria-label="مكالمة">
                        <Phone className="w-4 h-4 text-green-600" />
                      </Button>
                    </div>
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

function ConversationView({ conv, onBack, onCall }: { conv: ChatConversation; onBack: () => void; onCall: () => void }) {
  const { user } = useAuth();
  const { messages, sendMessage } = useMessages(conv.id);
  const [input, setInput] = useState('');
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

  return (
    <>
      <div className="flex items-center gap-2 p-3 border-b border-border">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 rotate-180" />
        </Button>
        <div className="flex-1">
          <p className="font-bold text-foreground">{title}</p>
        </div>
        {conv.type === 'private' && (
          <Button variant="ghost" size="icon" onClick={onCall} aria-label="مكالمة">
            <Phone className="w-4 h-4 text-green-600" />
          </Button>
        )}
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
                  'max-w-[80%] rounded-2xl px-3 py-2 text-sm break-words',
                  mine ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground',
                )}>
                  {m.content}
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
      <form onSubmit={onSubmit} className="p-2 border-t border-border flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="اكتب رسالة..."
          className="flex-1"
        />
        <Button type="submit" size="icon" disabled={!input.trim()}>
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </>
  );
}