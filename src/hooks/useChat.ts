import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ChatConversation {
  id: string;
  type: 'private' | 'group' | 'role_group';
  name: string | null;
  role_filter: string | null;
  last_message_at: string;
  unread_count?: number;
  other_user_id?: string;
  other_user_name?: string;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_name: string;
  sender_role: string | null;
  content: string;
  message_type: string;
  created_at: string;
}

/** Conversations the user is part of (private + role groups they belong to). */
export function useConversations() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id) return;
    // Get participant rows for current user
    const { data: parts } = await supabase
      .from('chat_participants')
      .select('conversation_id, last_read_at')
      .eq('user_id', user.id);
    const ids = (parts ?? []).map((p) => p.conversation_id);

    // Always include role groups (matching role or "all")
    const { data: roleGroups } = await supabase
      .from('chat_conversations')
      .select('*')
      .eq('type', 'role_group');
    const matchingGroups = (roleGroups ?? []).filter((g: any) => {
      if (g.role_filter === 'all') return true;
      if (g.role_filter === user.role) return true;
      if (g.role_filter === 'kitchen_cashier' && (user.role === 'kitchen' || user.role === 'cashier')) return true;
      return false;
    });
    const groupIds = matchingGroups.map((g: any) => g.id);
    const allIds = Array.from(new Set([...ids, ...groupIds]));
    if (allIds.length === 0) {
      setConversations([]);
      setLoading(false);
      return;
    }
    const { data: convs } = await supabase
      .from('chat_conversations')
      .select('*')
      .in('id', allIds)
      .order('last_message_at', { ascending: false });

    // Compute unread + private peer info
    const result: ChatConversation[] = [];
    for (const c of convs ?? []) {
      const part = parts?.find((p) => p.conversation_id === c.id);
      const lastRead = part?.last_read_at ?? '1970-01-01';
      const { count } = await supabase
        .from('chat_messages')
        .select('id', { count: 'exact', head: true })
        .eq('conversation_id', c.id)
        .gt('created_at', lastRead)
        .neq('sender_id', user.id);
      const conv: ChatConversation = { ...(c as any), unread_count: count ?? 0 };
      if (c.type === 'private') {
        const { data: peers } = await supabase
          .from('chat_participants')
          .select('user_id')
          .eq('conversation_id', c.id)
          .neq('user_id', user.id);
        if (peers?.[0]) {
          conv.other_user_id = peers[0].user_id;
          const { data: prof } = await supabase
            .from('profiles')
            .select('full_name, username')
            .eq('user_id', peers[0].user_id)
            .maybeSingle();
          conv.other_user_name = prof?.full_name || prof?.username || 'مستخدم';
        }
      }
      result.push(conv);
    }
    setConversations(result);
    setLoading(false);
  }, [user?.id, user?.role]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!user?.id) return;
    const ch = supabase
      .channel('chat-conv-watch')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_participants' }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user?.id, load]);

  return { conversations, loading, reload: load };
}

/** Messages for a single conversation, with realtime updates. */
export function useMessages(conversationId: string | null) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      return;
    }
    let active = true;
    supabase
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(200)
      .then(({ data }) => {
        if (active && data) setMessages(data as ChatMessage[]);
      });
    const ch = supabase
      .channel(`msg-${conversationId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as ChatMessage]);
        },
      )
      .subscribe();
    // Mark as read
    if (user?.id) {
      supabase
        .from('chat_participants')
        .upsert(
          { conversation_id: conversationId, user_id: user.id, last_read_at: new Date().toISOString() },
          { onConflict: 'conversation_id,user_id' },
        )
        .then(() => {});
    }
    return () => {
      active = false;
      supabase.removeChannel(ch);
    };
  }, [conversationId, user?.id]);

  const sendMessage = useCallback(
    async (content: string, message_type: string = 'text') => {
      if (!user?.id || !conversationId || !content.trim()) return;
      await supabase.from('chat_messages').insert({
        conversation_id: conversationId,
        sender_id: user.id,
        sender_name: user.fullName || user.username,
        sender_role: user.role,
        content: content.trim(),
        message_type,
      });
      // Trigger push for participants (best-effort)
      supabase.functions
        .invoke('send-chat-notification', {
          body: {
            conversation_id: conversationId,
            sender_id: user.id,
            sender_name: user.fullName || user.username,
            content: message_type === 'voice' ? '🎤 رسالة صوتية' : content.trim(),
          },
        })
        .catch(() => {});
    },
    [conversationId, user?.id, user?.username, user?.fullName, user?.role],
  );

  const markRead = useCallback(async () => {
    if (!user?.id || !conversationId) return;
    await supabase
      .from('chat_participants')
      .upsert(
        { conversation_id: conversationId, user_id: user.id, last_read_at: new Date().toISOString() },
        { onConflict: 'conversation_id,user_id' },
      );
  }, [conversationId, user?.id]);

  return { messages, sendMessage, markRead };
}

/** Find or create a private conversation with another user. */
export async function getOrCreatePrivateConversation(currentUserId: string, otherUserId: string): Promise<string> {
  // Look for existing
  const { data: mine } = await supabase
    .from('chat_participants')
    .select('conversation_id')
    .eq('user_id', currentUserId);
  const myIds = (mine ?? []).map((p) => p.conversation_id);
  if (myIds.length) {
    const { data: shared } = await supabase
      .from('chat_participants')
      .select('conversation_id')
      .eq('user_id', otherUserId)
      .in('conversation_id', myIds);
    for (const s of shared ?? []) {
      const { data: c } = await supabase
        .from('chat_conversations')
        .select('id, type')
        .eq('id', s.conversation_id)
        .maybeSingle();
      if (c?.type === 'private') return c.id;
    }
  }
  // Create new
  const { data: conv, error } = await supabase
    .from('chat_conversations')
    .insert({ type: 'private', created_by: currentUserId })
    .select('id')
    .single();
  if (error || !conv) throw error;
  await supabase.from('chat_participants').insert([
    { conversation_id: conv.id, user_id: currentUserId },
    { conversation_id: conv.id, user_id: otherUserId },
  ]);
  return conv.id;
}