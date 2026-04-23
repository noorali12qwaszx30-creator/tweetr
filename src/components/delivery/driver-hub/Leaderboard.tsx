import { useAuth } from '@/contexts/AuthContext';
import { useDriverPoints, getBadge } from '@/hooks/useDriverPoints';
import { Trophy, Award } from 'lucide-react';

export function Leaderboard() {
  const { user } = useAuth();
  const { leaderboard, totalPoints } = useDriverPoints(user?.id);
  const myBadge = getBadge(totalPoints);

  return (
    <div className="space-y-3">
      {/* My points card */}
      <div className="bg-gradient-to-br from-primary/20 to-primary/5 border-2 border-primary/30 rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">نقاطي في الشبكة</p>
            <p className="text-3xl font-black text-primary">{totalPoints}</p>
            <p className={`text-sm font-bold ${myBadge.color}`}>
              {myBadge.emoji} {myBadge.label}
            </p>
          </div>
          <Award className="w-12 h-12 text-primary opacity-30" />
        </div>
      </div>

      {/* Leaderboard */}
      <div className="bg-card border border-border rounded-2xl p-3 shadow-soft">
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="w-5 h-5 text-yellow-500" />
          <h3 className="font-bold text-sm">لوحة الشرف - أفضل المساهمين</h3>
        </div>

        {leaderboard.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-3">لا توجد بيانات بعد</p>
        ) : (
          <div className="space-y-2">
            {leaderboard.map((d, i) => {
              const badge = getBadge(d.total_points);
              const isMe = d.user_id === user?.id;
              const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`;
              return (
                <div
                  key={d.user_id}
                  className={`flex items-center justify-between p-2 rounded-xl ${
                    isMe ? 'bg-primary/10 border border-primary/30' : 'bg-muted/30'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg w-8 text-center font-bold">{medal}</span>
                    <div>
                      <p className="text-sm font-bold">
                        {d.user_name} {isMe && <span className="text-xs text-primary">(أنت)</span>}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {badge.emoji} {badge.label} • {d.posts_count} تبليغ
                      </p>
                    </div>
                  </div>
                  <div className="text-end">
                    <p className="font-black text-primary">{d.total_points}</p>
                    <p className="text-[10px] text-muted-foreground">نقطة</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}