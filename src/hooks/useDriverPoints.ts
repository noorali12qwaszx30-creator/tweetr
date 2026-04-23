import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PointEntry {
  id: string;
  user_id: string;
  points: number;
  reason: string;
  related_post_id: string | null;
  created_at: string;
}

export interface DriverRanking {
  user_id: string;
  user_name: string;
  total_points: number;
  posts_count: number;
}

export function useDriverPoints(userId?: string) {
  const [totalPoints, setTotalPoints] = useState(0);
  const [entries, setEntries] = useState<PointEntry[]>([]);
  const [leaderboard, setLeaderboard] = useState<DriverRanking[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    try {
      if (userId) {
        const { data: userPoints } = await supabase
          .from('driver_points')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(50);
        setEntries((userPoints as PointEntry[]) || []);
        const total = (userPoints || []).reduce((s: number, p: any) => s + p.points, 0);
        // Fetch full total separately to avoid limit
        const { data: allUserPoints } = await supabase
          .from('driver_points')
          .select('points')
          .eq('user_id', userId);
        const fullTotal = (allUserPoints || []).reduce((s: number, p: any) => s + p.points, 0);
        setTotalPoints(fullTotal || total);
      }

      // Leaderboard: aggregate per user from posts (for names) + points
      const { data: allPoints } = await supabase.from('driver_points').select('user_id, points');
      const { data: allPosts } = await supabase
        .from('driver_hub_posts')
        .select('user_id, user_name');

      const nameMap = new Map<string, string>();
      (allPosts || []).forEach((p: any) => {
        if (!nameMap.has(p.user_id)) nameMap.set(p.user_id, p.user_name);
      });

      const aggregateMap = new Map<string, { points: number; posts: number }>();
      (allPoints || []).forEach((p: any) => {
        const ex = aggregateMap.get(p.user_id) || { points: 0, posts: 0 };
        ex.points += p.points;
        aggregateMap.set(p.user_id, ex);
      });
      (allPosts || []).forEach((p: any) => {
        const ex = aggregateMap.get(p.user_id) || { points: 0, posts: 0 };
        ex.posts += 1;
        aggregateMap.set(p.user_id, ex);
      });

      const ranking: DriverRanking[] = Array.from(aggregateMap.entries())
        .map(([uid, v]) => ({
          user_id: uid,
          user_name: nameMap.get(uid) || 'سائق',
          total_points: v.points,
          posts_count: v.posts,
        }))
        .sort((a, b) => b.total_points - a.total_points)
        .slice(0, 20);
      setLeaderboard(ranking);
    } catch (err) {
      console.error('Points fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    const channel = supabase
      .channel('driver-points-feed')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'driver_points' }, () => fetchAll())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  return { totalPoints, entries, leaderboard, loading };
}

export function getBadge(points: number): { label: string; emoji: string; color: string } {
  if (points >= 500) return { label: 'السائق الأسطورة', emoji: '👑', color: 'text-yellow-500' };
  if (points >= 250) return { label: 'السائق الذهبي', emoji: '🥇', color: 'text-yellow-400' };
  if (points >= 100) return { label: 'حارس الطرق', emoji: '🛡️', color: 'text-blue-500' };
  if (points >= 50) return { label: 'العين الساهرة', emoji: '👁️', color: 'text-purple-500' };
  if (points >= 10) return { label: 'سائق نشط', emoji: '⚡', color: 'text-green-500' };
  return { label: 'سائق جديد', emoji: '🌱', color: 'text-muted-foreground' };
}