import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface DriverHubPost {
  id: string;
  user_id: string;
  user_name: string;
  post_type: string;
  title: string | null;
  content: string;
  image_url: string | null;
  delivery_area_id: string | null;
  delivery_area_name: string | null;
  severity: string;
  is_active: boolean;
  is_pinned: boolean;
  is_resolved: boolean;
  expires_at: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  thanks_count: number;
  still_there_count: number;
  created_at: string;
  updated_at: string;
}

export interface CreatePostInput {
  user_id: string;
  user_name: string;
  post_type: string;
  title?: string | null;
  content: string;
  image_url?: string | null;
  delivery_area_id?: string | null;
  delivery_area_name?: string | null;
  severity?: string;
}

export function useDriverHubPosts(filterAreaId?: string | null) {
  const [posts, setPosts] = useState<DriverHubPost[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPosts = async () => {
    try {
      const nowIso = new Date().toISOString();
      let query = supabase
        .from('driver_hub_posts')
        .select('*')
        .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (filterAreaId) {
        query = query.eq('delivery_area_id', filterAreaId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setPosts((data as DriverHubPost[]) || []);
    } catch (err) {
      console.error('Error fetching driver hub posts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
    const channel = supabase
      .channel(`driver-hub-posts-${filterAreaId || 'all'}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'driver_hub_posts' }, () => fetchPosts())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'driver_hub_reactions' }, () => fetchPosts())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterAreaId]);

  const createPost = async (input: CreatePostInput) => {
    try {
      const { error } = await supabase.from('driver_hub_posts').insert(input);
      if (error) throw error;
      await fetchPosts();
      return { success: true };
    } catch (err: any) {
      console.error('Error creating post:', err);
      return { success: false, error: err.message };
    }
  };

  const deletePost = async (id: string) => {
    try {
      const { error } = await supabase.from('driver_hub_posts').delete().eq('id', id);
      if (error) throw error;
      await fetchPosts();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const togglePin = async (id: string, current: boolean) => {
    try {
      const { error } = await supabase.from('driver_hub_posts').update({ is_pinned: !current }).eq('id', id);
      if (error) throw error;
      await fetchPosts();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  return { posts, loading, createPost, deletePost, togglePin, refetch: fetchPosts };
}

export async function uploadPostImage(file: Blob, userId: string): Promise<string | null> {
  try {
    const ext = 'jpg';
    const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from('driver-hub').upload(fileName, file, {
      contentType: 'image/jpeg',
      upsert: false,
    });
    if (error) throw error;
    const { data } = supabase.storage.from('driver-hub').getPublicUrl(fileName);
    return data.publicUrl;
  } catch (err) {
    console.error('Image upload error:', err);
    return null;
  }
}