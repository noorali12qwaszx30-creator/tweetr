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
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function isToday(date: string) {
  const d = new Date(date);
  return startOfDay(d).getTime() === startOfDay(new Date()).getTime();
}

function isYesterday(date: string) {
  const d = new Date(date);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return startOfDay(d).getTime() === startOfDay(yesterday).getTime();
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

export function DriverStatsTab({ deliveredOrders, cancelledOrders }: Props) {
  const stats = useMemo(() => {
    const todayDelivered = deliveredOrders.filter((o) => o.delivered_at && isToday(o.delivered_at));
    const yesterdayDelivered = deliveredOrders.filter((o) => o.delivered_at && isYesterday(o.delivered_at));
    const weekDelivered = deliveredOrders.filter((o) => o.delivered_at && isThisWeek(o.delivered_at));
    const monthDelivered = deliveredOrders.filter((o) => o.delivered_at && isThisMonth(o.delivered_at));

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
    const totalRestaurantDue = restaurantDue(deliveredOrders);

    const todayCollected = todayDelivered.reduce((s, o) => s + (o.total_price || 0), 0);

    const todayAvgTime = avgDeliveryMinutes(todayDelivered);
    const yesterdayAvgTime = avgDeliveryMinutes(yesterdayDelivered);
    const overallAvgTime = avgDeliveryMinutes(deliveredOrders);

    const totalAttempts = todayDelivered.length + todayCancelled.length;
    const cancelRate = totalAttempts > 0 ? Math.round((todayCancelled.length / totalAttempts) * 100) : 0;
    const successRate = totalAttempts > 0 ? Math.round((todayDelivered.length / totalAttempts) * 100) : 100;

    return {
      todayDelivered,
      yesterdayDelivered,
      weekDelivered,
      monthDelivered,
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
  }, [deliveredOrders, cancelledOrders]);

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
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          <div className="bg-gradient-to-br from-success/10 to-success/5 border border-success/20 rounded-2xl p-3 shadow-soft">
            <div className="flex items-center justify-between mb-1">
              <CheckCircle2 className="w-4 h-4 text-success" />
              <span className={`text-[10px] font-bold flex items-center gap-0.5 ${ordersComp.color}`}>
                {ordersComp.icon} {ordersComp.label}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">طلبات اليوم</p>
            <p className="text-2xl font-bold text-success">{toEnglishNumbers(stats.todayDelivered.length)}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">أمس: {toEnglishNumbers(stats.yesterdayDelivered.length)}</p>
          </div>

          <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-2xl p-3 shadow-soft">
            <div className="flex items-center justify-between mb-1">
              <DollarSign className="w-4 h-4 text-primary" />
              <span className={`text-[10px] font-bold flex items-center gap-0.5 ${earningsComp.color}`}>
                {earningsComp.icon} {earningsComp.label}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">أرباح اليوم</p>
            <p className="text-2xl font-bold text-primary">{formatNumberWithCommas(stats.todayEarnings)}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">د.ع • أمس: {formatNumberWithCommas(stats.yesterdayEarnings)}</p>
          </div>

          <div className="bg-gradient-to-br from-info/10 to-info/5 border border-info/20 rounded-2xl p-3 shadow-soft">
            <div className="flex items-center justify-between mb-1">
              <Clock className="w-4 h-4 text-info" />
              <span className={`text-[10px] font-bold flex items-center gap-0.5 ${timeComp.color}`}>
                {timeComp.icon} {timeComp.label}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">متوسط وقت التوصيل</p>
            <p className="text-2xl font-bold text-info">{toEnglishNumbers(stats.todayAvgTime)} <span className="text-sm">د</span></p>
            <p className="text-[10px] text-muted-foreground mt-0.5">أمس: {toEnglishNumbers(stats.yesterdayAvgTime)} د</p>
          </div>

          <div className="bg-gradient-to-br from-warning/10 to-warning/5 border border-warning/20 rounded-2xl p-3 shadow-soft">
            <div className="flex items-center justify-between mb-1">
              <Target className="w-4 h-4 text-warning" />
              <span className={`text-[10px] font-bold ${stats.successRate >= 90 ? 'text-success' : stats.successRate >= 70 ? 'text-warning' : 'text-destructive'}`}>
                {toEnglishNumbers(stats.successRate)}%
              </span>
            </div>
            <p className="text-xs text-muted-foreground">نسبة النجاح</p>
            <p className="text-2xl font-bold text-warning">{toEnglishNumbers(stats.successRate)}<span className="text-sm">%</span></p>
            <p className="text-[10px] text-muted-foreground mt-0.5">إلغاءات: {toEnglishNumbers(stats.todayCancelled.length)}</p>
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
            <p className="text-xl font-bold">{toEnglishNumbers(deliveredOrders.length)}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">أرباح</p>
            <p className="text-base font-bold text-primary">{formatNumberWithCommas(deliveredOrders.reduce((s, o) => s + (o.delivery_fee || 0), 0))}</p>
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