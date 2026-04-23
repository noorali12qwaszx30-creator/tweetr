import { useDriverHubPosts } from '@/hooks/useDriverHubPosts';
import { Activity, Users, ThumbsUp, CheckCircle2 } from 'lucide-react';

export function NetworkStats() {
  const { posts } = useDriverHubPosts();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayPosts = posts.filter((p) => new Date(p.created_at) >= todayStart);
  const resolvedToday = todayPosts.filter((p) => p.is_resolved).length;
  const totalThanks = posts.reduce((s, p) => s + p.thanks_count, 0);
  const uniqueDrivers = new Set(todayPosts.map((p) => p.user_id)).size;

  const stats = [
    { label: 'تبليغات اليوم', value: todayPosts.length, icon: Activity, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'سائقون نشطون', value: uniqueDrivers, icon: Users, color: 'text-green-500', bg: 'bg-green-500/10' },
    { label: 'مشاكل تم حلها', value: resolvedToday, icon: CheckCircle2, color: 'text-success', bg: 'bg-success/10' },
    { label: 'تفاعلات شكر', value: totalThanks, icon: ThumbsUp, color: 'text-purple-500', bg: 'bg-purple-500/10' },
  ];

  return (
    <div className="grid grid-cols-2 gap-2">
      {stats.map((s) => {
        const Icon = s.icon;
        return (
          <div key={s.label} className={`${s.bg} rounded-2xl p-3 border border-border/50`}>
            <Icon className={`w-5 h-5 ${s.color} mb-1`} />
            <p className="text-2xl font-black">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        );
      })}
    </div>
  );
}