import { useState, useMemo } from 'react';
import type { OrderWithItems } from '@/hooks/useSupabaseOrders';
import { useDeliveryAreas } from '@/hooks/useDeliveryAreas';
import { useDriverStats, type Period } from './stats/useDriverStats';
import { AnimatedCounter, StatCard, ProgressRing, MiniBarChart, HeatMapHours, TrendPill } from './stats/primitives';
import { toEnglishNumbers, formatNumberWithCommas } from '@/lib/formatNumber';
import {
  Activity,
  CheckCircle2,
  DollarSign,
  Clock,
  Target,
  Wallet,
  Building2,
  Trophy,
  Zap,
  MapPin,
  Flame,
  Star,
  Calendar,
  TrendingUp,
  Gauge,
  AlertTriangle,
  XCircle,
  Award,
  Timer,
  Sparkles,
} from 'lucide-react';

interface Props {
  deliveredOrders: OrderWithItems[];
  cancelledOrders: OrderWithItems[];
  historicalDelivered?: OrderWithItems[];
  historicalCancelled?: OrderWithItems[];
}

const PERIOD_LABELS: Record<Period, string> = {
  today: 'اليوم',
  week: 'الأسبوع',
  month: 'الشهر',
  year: 'السنة',
  all: 'الإجمالي',
};

export function DriverStatsTab(props: Props) {
  const [period, setPeriod] = useState<Period>('today');
  const stats = useDriverStats(props);
  const { areas } = useDeliveryAreas();

  const topAreaName = useMemo(() => {
    if (!stats.topAreaId) return '—';
    return areas.find((a) => a.id === stats.topAreaId)?.name || '—';
  }, [stats.topAreaId, areas]);

  // Period-dependent main numbers (Earnings & orders)
  const periodData = useMemo(() => {
    switch (period) {
      case 'today':
        return {
          orders: stats.today.length,
          earnings: stats.todayEarnings,
          prevOrders: stats.yesterday.length,
          prevEarnings: stats.yesterdayEarnings,
          prevLabel: 'أمس',
        };
      case 'week':
        return {
          orders: stats.week.length,
          earnings: stats.weekEarnings,
          prevOrders: stats.prevWeek.length,
          prevEarnings: stats.prevWeekEarnings,
          prevLabel: 'الأسبوع السابق',
        };
      case 'month':
        return {
          orders: stats.month.length,
          earnings: stats.monthEarnings,
          prevOrders: stats.prevMonth.length,
          prevEarnings: stats.prevMonthEarnings,
          prevLabel: 'الشهر السابق',
        };
      case 'year':
        return {
          orders: stats.year.length,
          earnings: stats.yearEarnings,
          prevOrders: 0,
          prevEarnings: 0,
          prevLabel: '',
        };
      default:
        return {
          orders: stats.all.length,
          earnings: stats.totalEarnings,
          prevOrders: 0,
          prevEarnings: 0,
          prevLabel: '',
        };
    }
  }, [period, stats]);

  const avgPerOrder = periodData.orders ? Math.round(periodData.earnings / periodData.orders) : 0;

  // Achievement badges
  const badges = useMemo(() => {
    const out: { icon: any; label: string; tone: string }[] = [];
    if (stats.today.length >= 10) out.push({ icon: Flame, label: 'ماراثون اليوم', tone: 'text-orange-500' });
    if (stats.successRate === 100 && stats.today.length > 0)
      out.push({ icon: Award, label: 'نجاح كامل', tone: 'text-emerald-500' });
    if (stats.todayAvg > 0 && stats.todayAvg <= 25)
      out.push({ icon: Zap, label: 'سرعة البرق', tone: 'text-sky-500' });
    if (stats.todayEarnings >= 50000) out.push({ icon: Star, label: 'يوم ذهبي', tone: 'text-amber-500' });
    return out;
  }, [stats]);

  return (
    <div className="space-y-4 pb-4">
      {/* ============ Header ============ */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-rose-500 flex items-center justify-center shadow-md">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold leading-tight">لوحة الأداء</h2>
            <p className="text-[10px] text-muted-foreground">منذ بداية الوردية ({toEnglishNumbers(stats.elapsedH)} ساعة)</p>
          </div>
        </div>
        {badges.length > 0 && (
          <div className="flex items-center gap-1">
            {badges.slice(0, 3).map((b, i) => {
              const Icon = b.icon;
              return (
                <div
                  key={i}
                  className={`w-8 h-8 rounded-full bg-card border border-border flex items-center justify-center shadow-sm ${b.tone}`}
                  title={b.label}
                >
                  <Icon className="w-4 h-4" />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ============ Quick Summary Glass Widget ============ */}
      <div className="relative overflow-hidden rounded-3xl p-4 bg-gradient-to-br from-orange-500 via-rose-500 to-fuchsia-600 shadow-elevated text-white">
        <div className="absolute -top-12 -left-12 w-40 h-40 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-10 -right-8 w-32 h-32 rounded-full bg-white/10 blur-2xl" />
        <div className="relative grid grid-cols-2 gap-3">
          <div>
            <p className="text-[11px] opacity-80">أرباح اليوم</p>
            <p className="text-3xl font-extrabold leading-tight">
              <AnimatedCounter value={stats.todayEarnings} />
              <span className="text-sm font-semibold mr-1 opacity-90">د.ع</span>
            </p>
            <p className="text-[10px] opacity-80 mt-0.5">
              متوقع نهاية الوردية: {formatNumberWithCommas(stats.projectedEarnings)}
            </p>
          </div>
          <div className="flex flex-col items-end justify-between">
            <ProgressRing value={stats.successRate} size={72} stroke={7} color="white" trackColor="white">
              <div className="text-center">
                <p className="text-xl font-extrabold">{toEnglishNumbers(stats.successRate)}%</p>
                <p className="text-[8px] opacity-80">نجاح</p>
              </div>
            </ProgressRing>
          </div>
        </div>
        <div className="relative grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-white/20">
          <div>
            <p className="text-[10px] opacity-80">طلبات</p>
            <p className="text-base font-bold">{toEnglishNumbers(stats.today.length)}</p>
          </div>
          <div>
            <p className="text-[10px] opacity-80">متوسط الوقت</p>
            <p className="text-base font-bold">{toEnglishNumbers(stats.todayAvg)} د</p>
          </div>
          <div>
            <p className="text-[10px] opacity-80">التقييم</p>
            <p className="text-base font-bold">{toEnglishNumbers(stats.rating)} <span className="text-xs">/ 5</span></p>
          </div>
        </div>
      </div>

      {/* ============ Period Filter ============ */}
      <div className="flex gap-1 p-1 bg-muted/40 rounded-2xl">
        {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
              period === p
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>

      {/* ============ Earnings for Selected Period ============ */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <StatCard
          tone="emerald"
          icon={<DollarSign className="w-4 h-4" />}
          label={`أرباح ${PERIOD_LABELS[period]}`}
          value={periodData.earnings}
          suffix="د.ع"
          trend={periodData.prevLabel ? { current: periodData.earnings, previous: periodData.prevEarnings } : undefined}
          hint={periodData.prevLabel ? `${periodData.prevLabel}: ${formatNumberWithCommas(periodData.prevEarnings)}` : undefined}
          delay={0}
        />
        <StatCard
          tone="sky"
          icon={<CheckCircle2 className="w-4 h-4" />}
          label={`طلبات ${PERIOD_LABELS[period]}`}
          value={periodData.orders}
          trend={periodData.prevLabel ? { current: periodData.orders, previous: periodData.prevOrders } : undefined}
          hint={periodData.prevLabel ? `${periodData.prevLabel}: ${toEnglishNumbers(periodData.prevOrders)}` : undefined}
          delay={60}
        />
        <StatCard
          tone="orange"
          icon={<TrendingUp className="w-4 h-4" />}
          label="متوسط الربح / طلب"
          value={avgPerOrder}
          suffix="د.ع"
          delay={120}
        />
        <StatCard
          tone="violet"
          icon={<Timer className="w-4 h-4" />}
          label="متوسط وقت التوصيل"
          value={stats.todayAvg}
          suffix="د"
          format="plain"
          hint={stats.fastest > 0 ? `الأسرع: ${toEnglishNumbers(stats.fastest)} د` : undefined}
          delay={180}
        />
      </div>

      {/* ============ Weekly chart ============ */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-orange-500" />
            <h3 className="text-sm font-bold">أرباح الأسبوع</h3>
          </div>
          {stats.bestDay && stats.bestDay.earnings > 0 && (
            <span className="text-[10px] text-muted-foreground">
              أفضل يوم: <span className="font-bold text-orange-600 dark:text-orange-400">{stats.bestDay.label}</span>
            </span>
          )}
        </div>
        <MiniBarChart
          data={stats.last7.map((d) => ({ label: d.label, value: d.earnings }))}
          highlightIndex={stats.last7.indexOf(stats.bestDay)}
        />
      </div>

      {/* ============ Restaurant Dues ============ */}
      <div className="relative overflow-hidden rounded-2xl border-2 border-rose-500/40 bg-gradient-to-br from-rose-50 to-amber-50 dark:from-rose-950/40 dark:to-amber-950/30 p-4 shadow-elevated">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-rose-600 dark:text-rose-400" />
            </div>
            <div>
              <h3 className="font-bold text-sm">مستحقات المطعم</h3>
              <p className="text-[10px] text-muted-foreground">المبلغ الذي يجب تسليمه</p>
            </div>
          </div>
          <Wallet className="w-4 h-4 text-muted-foreground" />
        </div>

        <div className="flex items-center gap-3">
          <ProgressRing
            value={
              stats.todayCollected > 0
                ? Math.round((stats.todayRestaurantDue / Math.max(stats.todayCollected, 1)) * 100)
                : 0
            }
            size={84}
            stroke={8}
            color="rgb(244 63 94)"
          >
            <div className="text-center">
              <p className="text-base font-extrabold text-rose-600 dark:text-rose-400">
                {stats.todayCollected > 0
                  ? toEnglishNumbers(Math.round((stats.todayRestaurantDue / stats.todayCollected) * 100))
                  : 0}
                %
              </p>
              <p className="text-[8px] text-muted-foreground">للمطعم</p>
            </div>
          </ProgressRing>
          <div className="flex-1">
            <p className="text-[10px] text-muted-foreground">مستحقات اليوم</p>
            <p className="text-2xl font-extrabold text-rose-600 dark:text-rose-400 leading-tight">
              <AnimatedCounter value={stats.todayRestaurantDue} />
              <span className="text-xs font-semibold mr-1">د.ع</span>
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">
              المحصّل اليوم: <span className="font-bold text-foreground">{formatNumberWithCommas(stats.todayCollected)}</span>
            </p>
          </div>
        </div>

        {stats.todayRestaurantDue >= 200000 && (
          <div className="mt-3 flex items-center gap-2 p-2 rounded-lg bg-rose-500/15 border border-rose-500/30 animate-pulse">
            <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            <p className="text-[10px] text-rose-700 dark:text-rose-300 font-semibold">
              تجاوزت 200,000 د.ع — يُفضّل تسليم المبلغ للمطعم قريباً.
            </p>
          </div>
        )}

        <div className="grid grid-cols-3 gap-2 text-center mt-3">
          <div className="bg-card/60 backdrop-blur rounded-lg p-2">
            <p className="text-[9px] text-muted-foreground">الأسبوع</p>
            <p className="text-xs font-bold text-rose-600 dark:text-rose-400">
              {formatNumberWithCommas(stats.weekRestaurantDue)}
            </p>
          </div>
          <div className="bg-card/60 backdrop-blur rounded-lg p-2">
            <p className="text-[9px] text-muted-foreground">الشهر</p>
            <p className="text-xs font-bold text-rose-600 dark:text-rose-400">
              {formatNumberWithCommas(stats.monthRestaurantDue)}
            </p>
          </div>
          <div className="bg-card/60 backdrop-blur rounded-lg p-2">
            <p className="text-[9px] text-muted-foreground">الإجمالي</p>
            <p className="text-xs font-bold text-rose-600 dark:text-rose-400">
              {formatNumberWithCommas(stats.totalRestaurantDue)}
            </p>
          </div>
        </div>
      </div>

      {/* ============ Performance Section ============ */}
      <div>
        <div className="flex items-center gap-2 mb-2 px-1">
          <Gauge className="w-4 h-4 text-violet-500" />
          <h3 className="text-sm font-bold">الأداء التشغيلي</h3>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          <StatCard
            tone="emerald"
            icon={<CheckCircle2 className="w-4 h-4" />}
            label="مكتملة اليوم"
            value={stats.today.length}
            delay={0}
          />
          <StatCard
            tone="rose"
            icon={<XCircle className="w-4 h-4" />}
            label="ملغاة اليوم"
            value={stats.todayCancelled.length}
            delay={60}
          />
          <StatCard
            tone="sky"
            icon={<Zap className="w-4 h-4" />}
            label="أسرع توصيل"
            value={stats.fastest}
            suffix="د"
            format="plain"
            delay={120}
          />
          <StatCard
            tone="amber"
            icon={<AlertTriangle className="w-4 h-4" />}
            label="معدل التأخير"
            value={stats.delayRate}
            suffix="%"
            format="plain"
            hint={`${toEnglishNumbers(stats.delayedCount)} طلب متأخر`}
            delay={180}
          />
          <StatCard
            tone="violet"
            icon={<Clock className="w-4 h-4" />}
            label="ساعات العمل اليوم"
            value={stats.todayHours}
            suffix="س"
            format="plain"
            delay={240}
          />
          <StatCard
            tone="orange"
            icon={<Star className="w-4 h-4" />}
            label="التقييم العام"
            value={stats.rating}
            suffix="/ 5"
            format="plain"
            delay={300}
          />
        </div>
      </div>

      {/* ============ Smart Analytics ============ */}
      <div>
        <div className="flex items-center gap-2 mb-2 px-1">
          <Sparkles className="w-4 h-4 text-fuchsia-500" />
          <h3 className="text-sm font-bold">تحليلات ذكية</h3>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          <div className="rounded-2xl border border-border bg-card p-3 shadow-soft">
            <div className="flex items-center gap-2 mb-1">
              <MapPin className="w-4 h-4 text-fuchsia-500" />
              <p className="text-[11px] text-muted-foreground">أكثر منطقة نشاطاً</p>
            </div>
            <p className="text-base font-bold truncate">{topAreaName}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-3 shadow-soft">
            <div className="flex items-center gap-2 mb-1">
              <Flame className="w-4 h-4 text-orange-500" />
              <p className="text-[11px] text-muted-foreground">ساعة الذروة</p>
            </div>
            <p className="text-base font-bold">
              {stats.today.length > 0 ? `${toEnglishNumbers(stats.peakHour)}:00` : '—'}
            </p>
          </div>
        </div>

        <div className="mt-3 rounded-2xl border border-border bg-card p-4 shadow-soft">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-orange-500" />
              <p className="text-sm font-bold">توزيع النشاط على الساعات</p>
            </div>
            <span className="text-[10px] text-muted-foreground">آخر 24 ساعة</span>
          </div>
          <HeatMapHours hourly={stats.hourly} />
        </div>
      </div>

      {/* ============ All-time ============ */}
      <div className="rounded-2xl border border-border bg-gradient-to-br from-card via-card to-amber-50/40 dark:to-amber-950/20 p-4 shadow-soft">
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="w-5 h-5 text-amber-500" />
          <h3 className="font-bold text-sm">إجمالي مسيرتي</h3>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-[10px] text-muted-foreground">طلبات</p>
            <p className="text-xl font-extrabold">
              <AnimatedCounter value={stats.all.length} format="plain" />
            </p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">أرباح</p>
            <p className="text-base font-extrabold text-orange-600 dark:text-orange-400">
              <AnimatedCounter value={stats.totalEarnings} />
            </p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">متوسط الوقت</p>
            <p className="text-xl font-extrabold text-sky-600 dark:text-sky-400">
              <AnimatedCounter value={stats.overallAvg} format="plain" />
              <span className="text-xs"> د</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}