import { useMemo } from 'react';
import { OrderWithItems } from '@/hooks/useSupabaseOrders';
import { toEnglishNumbers, formatNumberWithCommas } from '@/lib/formatNumber';
import {
  CheckCircle2,
  XCircle,
  DollarSign,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  Trophy,
  Activity,
  Target,
  Wallet,
  Building2,
} from 'lucide-react';

interface Props {
  deliveredOrders: OrderWithItems[];
  cancelledOrders: OrderWithItems[];
  /** Archived (post-reset) delivered orders — used only for week/month/all-time aggregates */
  historicalDelivered?: OrderWithItems[];
  /** Archived (post-reset) cancelled orders — reserved for future aggregates */
  historicalCancelled?: OrderWithItems[];
}

// يوم العمل التشغيلي يبدأ الساعة 11:00 صباحاً (نفس موعد الـ daily reset)
// وليس منتصف الليل، حتى لا تتصفّر إحصائيات الوردية عند 12 ليلاً.
const SHIFT_START_HOUR = 11;

function startOfCurrentShift(now: Date = new Date()): Date {
  const start = new Date(now);
  start.setHours(SHIFT_START_HOUR, 0, 0, 0);
  // لو الساعة الآن قبل 11 صباحاً فالوردية الحالية بدأت 11 صباحاً أمس
  if (now.getTime() < start.getTime()) {
    start.setDate(start.getDate() - 1);
  }
  return start;
}

function isToday(date: string) {
  const d = new Date(date).getTime();
  const start = startOfCurrentShift().getTime();
  const end = start + 24 * 60 * 60 * 1000;
  return d >= start && d < end;
}

function isYesterday(date: string) {
  const d = new Date(date).getTime();
  const currentStart = startOfCurrentShift().getTime();
  const prevStart = currentStart - 24 * 60 * 60 * 1000;
  return d >= prevStart && d < currentStart;
}

function isThisWeek(date: string) {
  const d = new Date(date);
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  return d >= weekAgo;
}

function isThisMonth(date: string) {
  const d = new Date(date);
  const now = new Date();
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

function avgDeliveryMinutes(orders: OrderWithItems[]) {
  const valid = orders.filter((o) => o.delivered_at && o.created_at);
  if (valid.length === 0) return 0;
  const total = valid.reduce((sum, o) => {
    const start = new Date(o.created_at).getTime();
    const end = new Date(o.delivered_at!).getTime();
    return sum + (end - start) / 60000;
  }, 0);
  return Math.round(total / valid.length);
}

function comparisonIcon(today: number, yesterday: number) {
  if (yesterday === 0) {
    if (today === 0) return { icon: <Minus className="w-3 h-3" />, color: 'text-muted-foreground', label: 'بدون تغيير' };
    return { icon: <TrendingUp className="w-3 h-3" />, color: 'text-success', label: 'جديد' };
  }
  const diff = ((today - yesterday) / yesterday) * 100;
  if (Math.abs(diff) < 1) return { icon: <Minus className="w-3 h-3" />, color: 'text-muted-foreground', label: 'مستقر' };
  if (diff > 0) return { icon: <TrendingUp className="w-3 h-3" />, color: 'text-success', label: `+${Math.round(diff)}%` };
  return { icon: <TrendingDown className="w-3 h-3" />, color: 'text-destructive', label: `${Math.round(diff)}%` };
}

export function DriverStatsTab({
  deliveredOrders,
  cancelledOrders,
  historicalDelivered = [],
  historicalCancelled = [],
}: Props) {
  const stats = useMemo(() => {
    // "Today" comes only from live (non-archived) orders so the daily reset truly clears it.
    const todayDelivered = deliveredOrders.filter((o) => o.delivered_at && isToday(o.delivered_at));

    // For week/month/all-time include archived (historical) orders so the figures
    // survive the daily reset. Dedupe by id in case of brief overlap.
    const seen = new Set<string>();
    const allDelivered = [...deliveredOrders, ...historicalDelivered].filter((o) => {
      if (seen.has(o.id)) return false;
      seen.add(o.id);
      return true;
    });

    const yesterdayDelivered = allDelivered.filter((o) => o.delivered_at && isYesterday(o.delivered_at));
    const weekDelivered = allDelivered.filter((o) => o.delivered_at && isThisWeek(o.delivered_at));
    const monthDelivered = allDelivered.filter((o) => o.delivered_at && isThisMonth(o.delivered_at));

    const todayCancelled = cancelledOrders.filter((o) => o.cancelled_at && isToday(o.cancelled_at));

    const todayEarnings = todayDelivered.reduce((s, o) => s + (o.delivery_fee || 0), 0);
    const yesterdayEarnings = yesterdayDelivered.reduce((s, o) => s + (o.delivery_fee || 0), 0);
    const weekEarnings = weekDelivered.reduce((s, o) => s + (o.delivery_fee || 0), 0);
    const monthEarnings = monthDelivered.reduce((s, o) => s + (o.delivery_fee || 0), 0);

    // مستحقات المطعم = إجمالي الطلب - أجور التوصيل (المبلغ الذي يجب على السائق تسليمه للمطعم)
    const restaurantDue = (orders: OrderWithItems[]) =>
      orders.reduce((s, o) => s + Math.max((o.total_price || 0) - (o.delivery_fee || 0), 0), 0);

    const todayRestaurantDue = restaurantDue(todayDelivered);
    const yesterdayRestaurantDue = restaurantDue(yesterdayDelivered);
    const weekRestaurantDue = restaurantDue(weekDelivered);
    const monthRestaurantDue = restaurantDue(monthDelivered);
    const totalRestaurantDue = restaurantDue(allDelivered);

    const todayCollected = todayDelivered.reduce((s, o) => s + (o.total_price || 0), 0);

    const todayAvgTime = avgDeliveryMinutes(todayDelivered);
    const yesterdayAvgTime = avgDeliveryMinutes(yesterdayDelivered);
    const overallAvgTime = avgDeliveryMinutes(allDelivered);

    const totalAttempts = todayDelivered.length + todayCancelled.length;
    const cancelRate = totalAttempts > 0 ? Math.round((todayCancelled.length / totalAttempts) * 100) : 0;
    const successRate = totalAttempts > 0 ? Math.round((todayDelivered.length / totalAttempts) * 100) : 100;

    return {
      todayDelivered,
      yesterdayDelivered,
      weekDelivered,
      monthDelivered,
      allDelivered,
      todayCancelled,
      todayEarnings,
      yesterdayEarnings,
      weekEarnings,
      monthEarnings,
      todayRestaurantDue,
      yesterdayRestaurantDue,
      weekRestaurantDue,
      monthRestaurantDue,
      totalRestaurantDue,
      todayCollected,
      todayAvgTime,
      yesterdayAvgTime,
      overallAvgTime,
      cancelRate,
      successRate,
    };
  }, [deliveredOrders, cancelledOrders, historicalDelivered, historicalCancelled]);

  const ordersComp = comparisonIcon(stats.todayDelivered.length, stats.yesterdayDelivered.length);
  const earningsComp = comparisonIcon(stats.todayEarnings, stats.yesterdayEarnings);
  const timeComp = comparisonIcon(stats.yesterdayAvgTime, stats.todayAvgTime); // أقل = أفضل، فنعكس

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Activity className="w-5 h-5 text-primary" />
        <h2 className="text-lg sm:text-xl font-bold">إحصائياتي</h2>
      </div>

      {/* Today's KPIs */}
      <div>
        <h3 className="text-xs font-bold text-muted-foreground mb-2 px-1">اليوم</h3>
        <div className="grid grid-cols-2 gap-2 sm:gap-3 auto-rows-fr">
          <div className="bg-card border border-success/30 rounded-2xl p-3 shadow-soft min-h-[120px] flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1">
              <div className="w-8 h-8 rounded-lg bg-success/15 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-success" />
              </div>
              <span className={`text-[10px] font-bold flex items-center gap-0.5 ${ordersComp.color}`}>
                {ordersComp.icon} {ordersComp.label}
              </span>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">طلبات اليوم</p>
              <p className="text-2xl font-bold text-success leading-tight">{toEnglishNumbers(stats.todayDelivered.length)}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">أمس: {toEnglishNumbers(stats.yesterdayDelivered.length)}</p>
            </div>
          </div>

          <div className="bg-card border border-primary/30 rounded-2xl p-3 shadow-soft min-h-[120px] flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1">
              <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-primary" />
              </div>
              <span className={`text-[10px] font-bold flex items-center gap-0.5 ${earningsComp.color}`}>
                {earningsComp.icon} {earningsComp.label}
              </span>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">أرباح اليوم</p>
              <p className="text-2xl font-bold text-primary leading-tight">{formatNumberWithCommas(stats.todayEarnings)}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">د.ع • أمس: {formatNumberWithCommas(stats.yesterdayEarnings)}</p>
            </div>
          </div>

          <div className="bg-card border border-info/30 rounded-2xl p-3 shadow-soft min-h-[120px] flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1">
              <div className="w-8 h-8 rounded-lg bg-info/15 flex items-center justify-center">
                <Clock className="w-4 h-4 text-info" />
              </div>
              <span className={`text-[10px] font-bold flex items-center gap-0.5 ${timeComp.color}`}>
                {timeComp.icon} {timeComp.label}
              </span>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">متوسط وقت التوصيل</p>
              <p className="text-2xl font-bold text-info leading-tight">{toEnglishNumbers(stats.todayAvgTime)} <span className="text-sm">د</span></p>
              <p className="text-[10px] text-muted-foreground mt-0.5">أمس: {toEnglishNumbers(stats.yesterdayAvgTime)} د</p>
            </div>
          </div>

          <div className="bg-card border border-warning/30 rounded-2xl p-3 shadow-soft min-h-[120px] flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1">
              <div className="w-8 h-8 rounded-lg bg-warning/15 flex items-center justify-center">
                <Target className="w-4 h-4 text-warning" />
              </div>
              <span className={`text-[10px] font-bold ${stats.successRate >= 90 ? 'text-success' : stats.successRate >= 70 ? 'text-warning' : 'text-destructive'}`}>
                {toEnglishNumbers(stats.successRate)}%
              </span>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">نسبة النجاح</p>
              <p className="text-2xl font-bold text-warning leading-tight">{toEnglishNumbers(stats.successRate)}<span className="text-sm">%</span></p>
              <p className="text-[10px] text-muted-foreground mt-0.5">إلغاءات: {toEnglishNumbers(stats.todayCancelled.length)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* مستحقات المطعم - بطاقة مميزة */}
      <div className="bg-gradient-to-br from-destructive/15 via-destructive/10 to-warning/10 border-2 border-destructive/30 rounded-2xl p-4 shadow-elevated">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-destructive/20 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <h3 className="font-bold text-sm">مستحقات المطعم</h3>
              <p className="text-[10px] text-muted-foreground">المبلغ الذي يجب تسليمه للمطعم</p>
            </div>
          </div>
          <Wallet className="w-4 h-4 text-muted-foreground" />
        </div>

        <div className="bg-card/60 backdrop-blur rounded-xl p-3 mb-2">
          <p className="text-[10px] text-muted-foreground mb-0.5">مستحقات اليوم</p>
          <p className="text-3xl font-bold text-destructive leading-tight">
            {formatNumberWithCommas(stats.todayRestaurantDue)} <span className="text-base font-semibold">د.ع</span>
          </p>
          <div className="flex items-center justify-between mt-1.5 text-[10px]">
            <span className="text-muted-foreground">
              المحصّل اليوم: <span className="font-bold text-foreground">{formatNumberWithCommas(stats.todayCollected)}</span> د.ع
            </span>
            <span className="text-muted-foreground">
              أمس: <span className="font-bold text-foreground">{formatNumberWithCommas(stats.yesterdayRestaurantDue)}</span>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-card/40 rounded-lg p-2">
            <p className="text-[9px] text-muted-foreground">الأسبوع</p>
            <p className="text-xs font-bold text-destructive">{formatNumberWithCommas(stats.weekRestaurantDue)}</p>
          </div>
          <div className="bg-card/40 rounded-lg p-2">
            <p className="text-[9px] text-muted-foreground">الشهر</p>
            <p className="text-xs font-bold text-destructive">{formatNumberWithCommas(stats.monthRestaurantDue)}</p>
          </div>
          <div className="bg-card/40 rounded-lg p-2">
            <p className="text-[9px] text-muted-foreground">الإجمالي</p>
            <p className="text-xs font-bold text-destructive">{formatNumberWithCommas(stats.totalRestaurantDue)}</p>
          </div>
        </div>
      </div>

      {/* Period Stats */}
      <div>
        <h3 className="text-xs font-bold text-muted-foreground mb-2 px-1">على المدى الأطول</h3>
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          <div className="bg-card border border-border rounded-2xl p-3 shadow-soft">
            <p className="text-xs text-muted-foreground mb-1">هذا الأسبوع</p>
            <p className="text-xl font-bold">{toEnglishNumbers(stats.weekDelivered.length)} <span className="text-xs font-normal text-muted-foreground">طلب</span></p>
            <p className="text-sm text-primary font-semibold">{formatNumberWithCommas(stats.weekEarnings)} د.ع</p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-3 shadow-soft">
            <p className="text-xs text-muted-foreground mb-1">هذا الشهر</p>
            <p className="text-xl font-bold">{toEnglishNumbers(stats.monthDelivered.length)} <span className="text-xs font-normal text-muted-foreground">طلب</span></p>
            <p className="text-sm text-primary font-semibold">{formatNumberWithCommas(stats.monthEarnings)} د.ع</p>
          </div>
        </div>
      </div>

      {/* All-time */}
      <div className="bg-gradient-to-br from-card to-muted/20 border border-border rounded-2xl p-4 shadow-soft">
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="w-5 h-5 text-warning" />
          <h3 className="font-bold">إجمالي مسيرتي</h3>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-[10px] text-muted-foreground">طلبات</p>
            <p className="text-xl font-bold">{toEnglishNumbers(stats.allDelivered.length)}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">أرباح</p>
            <p className="text-base font-bold text-primary">{formatNumberWithCommas(stats.allDelivered.reduce((s, o) => s + (o.delivery_fee || 0), 0))}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">متوسط الوقت</p>
            <p className="text-xl font-bold text-info">{toEnglishNumbers(stats.overallAvgTime)} <span className="text-xs">د</span></p>
          </div>
        </div>
      </div>
    </div>
  );
}