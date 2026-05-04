import { useState, useEffect } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useRole } from '@/contexts/RoleContext';
import { useConversations } from '@/hooks/useChat';
import { usePresence } from '@/hooks/usePresence';
import { ChatPanel } from './ChatPanel';
import { IncomingCallScreen } from './IncomingCallScreen';
import { ActiveCallScreen } from './ActiveCallScreen';
import { useIncomingCalls } from '@/hooks/useWebRTC';
import { cn } from '@/lib/utils';

/** Floating chat bubble visible across the app for logged-in users. */
export function ChatBubble() {
  const { user, isAuthenticated } = useAuth();
  const { role } = useRole();
  const [open, setOpen] = useState(false);
  const [activeCall, setActiveCall] = useState<{ callId: string; isCaller: boolean; peerName: string } | null>(null);
  const { incoming, dismiss } = useIncomingCalls();
  // Mount presence + conversations hooks
  usePresence();
  const { conversations } = useConversations();

  const totalUnread = conversations.reduce((s, c) => s + (c.unread_count || 0), 0);

  // Hide on kitchen TV view
  if (!isAuthenticated || !user) return null;
  if (role === 'kitchen') return null;

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'fixed bottom-20 left-4 z-[60] w-14 h-14 rounded-full shadow-lg',
          'bg-primary text-primary-foreground hover:scale-105 transition-transform',
          'flex items-center justify-center',
        )}
        aria-label="المحادثات"
      >
        {open ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
        {!open && totalUnread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-destructive text-destructive-foreground text-xs font-bold flex items-center justify-center">
            {totalUnread > 99 ? '99+' : totalUnread}
          </span>
        )}
      </button>

      {open && (
        <ChatPanel
          onClose={() => setOpen(false)}
          onStartCall={(callId, peerName) => {
            setOpen(false);
            setActiveCall({ callId, isCaller: true, peerName });
          }}
        />
      )}

      {incoming && !activeCall && (
        <IncomingCallScreen
          call={incoming}
          onAccept={() => {
            setActiveCall({ callId: incoming.id, isCaller: false, peerName: incoming.caller_name });
            dismiss();
          }}
          onReject={() => dismiss()}
        />
      )}

      {activeCall && (
        <ActiveCallScreen
          callId={activeCall.callId}
          isCaller={activeCall.isCaller}
          peerName={activeCall.peerName}
          onEnd={() => setActiveCall(null)}
        />
      )}
    </>
  );
}