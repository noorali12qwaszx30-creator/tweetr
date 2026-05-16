import { useMemo } from 'react';
import type { OrderWithItems } from '@/hooks/useSupabaseOrders';
import {
  isInCurrentShift,
  isInPreviousShift,
  isWithinDays,
  isThisMonth,
  isThisYear,
  startOfCurrentShift,
} from './shiftTime';

export type Period = 'today' | 'week' | 'month' | 'year' | 'all';

export interface DriverStatsInput {
  deliveredOrders: OrderWithItems[];
  cancelledOrders: OrderWithItems[];
  historicalDelivered?: OrderWithItems[];
  historicalCancelled?: OrderWithItems[];
}

const fee = (o: OrderWithItems) => o.delivery_fee || 0;
const restDue = (o: OrderWithItems) => Math.max((o.total_price || 0) - (o.delivery_fee || 0), 0);

function deliveryMinutes(o: OrderWithItems): number | null {
  if (!o.delivered_at || !o.created_at) return null;
  return (new Date(o.delivered_at).getTime() - new Date(o.created_at).getTime()) / 60000;
}

function dedupe(orders: OrderWithItems[]): OrderWithItems[] {
  const seen = new Set<string>();
  return orders.filter((o) => (seen.has(o.id) ? false : (seen.add(o.id), true)));
}

export function useDriverStats({
  deliveredOrders,
  cancelledOrders,
  historicalDelivered = [],
  historicalCancelled = [],
}: DriverStatsInput) {
  return useMemo(() => {
    // Today = live only (cleared on daily reset)
    const today = deliveredOrders.filter((o) => o.delivered_at && isInCurrentShift(o.delivered_at));
    const todayCancelled = cancelledOrders.filter((o) => o.cancelled_at && isInCurrentShift(o.cancelled_at));

    // Longer periods include history
    const all = dedupe([...deliveredOrders, ...historicalDelivered]);
    const allCancelled = dedupe([...cancelledOrders, ...historicalCancelled]);

    const yesterday = all.filter((o) => o.delivered_at && isInPreviousShift(o.delivered_at));
    const week = all.filter((o) => o.delivered_at && isWithinDays(o.delivered_at, 7));
    const prevWeek = all.filter(
      (o) => o.delivered_at && isWithinDays(o.delivered_at, 14) && !isWithinDays(o.delivered_at, 7)
    );
    const month = all.filter((o) => o.delivered_at && isThisMonth(o.delivered_at));
    const prevMonth = (() => {
      const now = new Date();
      const m = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
      const y = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
      return all.filter((o) => {
        if (!o.delivered_at) return false;
        const d = new Date(o.delivered_at);
        return d.getMonth() === m && d.getFullYear() === y;
      });
    })();
    const year = all.filter((o) => o.delivered_at && isThisYear(o.delivered_at));

    const sum = (arr: OrderWithItems[], f: (o: OrderWithItems) => number) => arr.reduce((s, o) => s + f(o), 0);

    // Hourly distribution (24 buckets) for today
    const hourly = Array(24).fill(0);
    today.forEach((o) => {
      if (o.delivered_at) hourly[new Date(o.delivered_at).getHours()]++;
    });
    const peakHour = hourly.indexOf(Math.max(...hourly));

    // Daily distribution for the past 7 days (earnings & count)
    const last7 = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - (6 - i));
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      const orders = all.filter((o) => {
        if (!o.delivered_at) return false;
        const t = new Date(o.delivered_at).getTime();
        return t >= d.getTime() && t < next.getTime();
      });
      return {
        label: ['أحد', 'إثن', 'ثلا', 'أرب', 'خمي', 'جمع', 'سبت'][d.getDay()],
        date: d,
        count: orders.length,
        earnings: sum(orders, fee),
      };
    });
    const bestDay = last7.reduce((b, d) => (d.earnings > b.earnings ? d : b), last7[0]);

    // Monthly distribution for the year (12 buckets)
    const monthly = Array.from({ length: 12 }, (_, m) => {
      const orders = year.filter((o) => o.delivered_at && new Date(o.delivered_at).getMonth() === m);
      return {
        label: ['ينا', 'فبر', 'مار', 'أبر', 'ماي', 'يون', 'يول', 'أغس', 'سبت', 'أكت', 'نوف', 'ديس'][m],
        count: orders.length,
        earnings: sum(orders, fee),
      };
    });

    // Delivery time stats (today)
    const todayTimes = today.map(deliveryMinutes).filter((x): x is number => x !== null);
    const avgTime = (arr: number[]) => (arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0);
    const todayAvg = avgTime(todayTimes);
    const fastest = todayTimes.length ? Math.round(Math.min(...todayTimes)) : 0;
    const slowest = todayTimes.length ? Math.round(Math.max(...todayTimes)) : 0;
    const delayedCount = todayTimes.filter((t) => t > 45).length;
    const delayRate = todayTimes.length ? Math.round((delayedCount / todayTimes.length) * 100) : 0;

    const overallTimes = all.map(deliveryMinutes).filter((x): x is number => x !== null);
    const overallAvg = avgTime(overallTimes);

    // Success rate today
    const todayAttempts = today.length + todayCancelled.length;
    const successRate = todayAttempts ? Math.round((today.length / todayAttempts) * 100) : 100;

    // Work hours today: span between first created_at and last delivered_at within shift
    const workHours = (orders: OrderWithItems[]): number => {
      if (orders.length === 0) return 0;
      const times = orders.flatMap((o) => [
        new Date(o.created_at).getTime(),
        o.delivered_at ? new Date(o.delivered_at).getTime() : 0,
      ]).filter(Boolean);
      if (times.length === 0) return 0;
      const hours = (Math.max(...times) - Math.min(...times)) / 3600000;
      return Math.max(0, Math.round(hours * 10) / 10);
    };
    const todayHours = workHours(today);
    const weekHours = workHours(week);

    // Area distribution
    const areaCount = new Map<string, number>();
    today.forEach((o) => {
      if (o.delivery_area_id) areaCount.set(o.delivery_area_id, (areaCount.get(o.delivery_area_id) || 0) + 1);
    });
    const topAreaId = [...areaCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || null;

    // Earnings projection (today): linear extrapolation based on shift elapsed
    const shiftStart = startOfCurrentShift().getTime();
    const elapsedH = (Date.now() - shiftStart) / 3600000;
    const todayEarnings = sum(today, fee);
    const projectedEarnings = elapsedH > 0.5 ? Math.round((todayEarnings / elapsedH) * 24) : todayEarnings;

    // Rating (0-5) based on success rate + delivery speed
    const speedScore = todayAvg === 0 ? 5 : Math.max(0, Math.min(5, 5 - (todayAvg - 25) / 10));
    const rating = Math.round(((successRate / 100) * 5 * 0.6 + speedScore * 0.4) * 10) / 10;

    return {
      today,
      todayCancelled,
      yesterday,
      week,
      prevWeek,
      month,
      prevMonth,
      year,
      all,
      allCancelled,

      todayEarnings,
      yesterdayEarnings: sum(yesterday, fee),
      weekEarnings: sum(week, fee),
      prevWeekEarnings: sum(prevWeek, fee),
      monthEarnings: sum(month, fee),
      prevMonthEarnings: sum(prevMonth, fee),
      yearEarnings: sum(year, fee),
      totalEarnings: sum(all, fee),

      todayRestaurantDue: sum(today, restDue),
      weekRestaurantDue: sum(week, restDue),
      monthRestaurantDue: sum(month, restDue),
      totalRestaurantDue: sum(all, restDue),
      todayCollected: sum(today, (o) => o.total_price || 0),

      hourly,
      peakHour,
      last7,
      bestDay,
      monthly,

      todayAvg,
      fastest,
      slowest,
      delayedCount,
      delayRate,
      overallAvg,

      successRate,
      todayHours,
      weekHours,
      topAreaId,
      projectedEarnings,
      rating,
      elapsedH: Math.round(elapsedH * 10) / 10,
    };
  }, [deliveredOrders, cancelledOrders, historicalDelivered, historicalCancelled]);
}

export type DriverStats = ReturnType<typeof useDriverStats>;