import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Reaction {
  id: string;
  post_id: string;
  user_id: string;
  user_name: string;
  reaction_type: string;
  created_at: string;
}

export function useUserReactions(userId?: string) {
  const [reactions, setReactions] = useState<Reaction[]>([]);

  const fetch = async () => {
    if (!userId) return;
    const { data } = await supabase.from('driver_hub_reactions').select('*').eq('user_id', userId);
    setReactions((data as Reaction[]) || []);
  };

  useEffect(() => {
    fetch();
    const channel = supabase
      .channel(`user-reactions-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'driver_hub_reactions', filter: `user_id=eq.${userId}` }, () => fetch())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const hasReacted = (postId: string, type: string) =>
    reactions.some((r) => r.post_id === postId && r.reaction_type === type);

  const toggleReaction = async (postId: string, type: string, userName: string) => {
    if (!userId) return { success: false };
    try {
      if (hasReacted(postId, type)) {
        await supabase
          .from('driver_hub_reactions')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', userId)
          .eq('reaction_type', type);
      } else {
        await supabase.from('driver_hub_reactions').insert({
          post_id: postId,
          user_id: userId,
          user_name: userName,
          reaction_type: type,
        });
      }
      await fetch();
      return { success: true };
    } catch (err: any) {
      console.error('Toggle reaction error:', err);
      return { success: false, error: err.message };
    }
  };

  return { reactions, hasReacted, toggleReaction };
}