import { useDriverHubPosts } from '@/hooks/useDriverHubPosts';
import { useDeliveryAreas } from '@/hooks/useDeliveryAreas';
import { Flame } from 'lucide-react';

export function HeatMap() {
  const { posts } = useDriverHubPosts();
  const { areas } = useDeliveryAreas();

  const areaActivity = new Map<string, { count: number; critical: number; name: string }>();
  posts
    .filter((p) => !p.is_resolved && p.delivery_area_id)
    .forEach((p) => {
      const ex = areaActivity.get(p.delivery_area_id!) || { count: 0, critical: 0, name: p.delivery_area_name || '' };
      ex.count += 1;
      if (p.severity === 'critical') ex.critical += 1;
      areaActivity.set(p.delivery_area_id!, ex);
    });

  const sorted = Array.from(areaActivity.entries())
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => b.count - a.count);

  const getColor = (count: number, critical: number) => {
    if (critical > 0 || count >= 5) return { bg: 'bg-red-500/20', border: 'border-red-500', text: 'text-red-700', label: '🔥 حرج' };
    if (count >= 3) return { bg: 'bg-orange-500/20', border: 'border-orange-500', text: 'text-orange-700', label: '⚠️ مزدحم' };
    if (count >= 1) return { bg: 'bg-yellow-500/20', border: 'border-yellow-500', text: 'text-yellow-700', label: '⚡ نشط' };
    return { bg: 'bg-green-500/20', border: 'border-green-500', text: 'text-green-700', label: '✅ هادئ' };
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-3 shadow-soft">
      <div className="flex items-center gap-2 mb-3">
        <Flame className="w-5 h-5 text-destructive" />
        <h3 className="font-bold text-sm">خريطة الحرارة - المناطق الأكثر نشاطاً</h3>
      </div>

      {sorted.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-3">لا توجد تبليغات نشطة في أي منطقة 🟢</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {sorted.slice(0, 9).map((a) => {
            const c = getColor(a.count, a.critical);
            return (
              <div key={a.id} className={`${c.bg} ${c.border} border-2 rounded-xl p-2 text-center`}>
                <p className={`font-bold text-xs ${c.text}`}>{a.name}</p>
                <p className="text-xs text-muted-foreground">{a.count} تبليغ</p>
                <p className={`text-[10px] font-bold ${c.text}`}>{c.label}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}