import { useEffect, useRef } from 'react';
import { OrderWithItems } from '@/hooks/useSupabaseOrders';

const LATE_THRESHOLD_MIN = 30;
const SIREN_DURATION_SEC = 6;

function parseDate(s: string) {
  return new Date(s.endsWith('Z') || s.includes('+') ? s : s + 'Z');
}

/**
 * Plays a loud 6-second siren ONCE per order when it crosses the 30-minute mark.
 * Uses WebAudio so no audio asset is required and volume is maxed out.
 */
export function useLateOrderSiren(orders: OrderWithItems[], enabled: boolean) {
  const announcedRef = useRef<Set<string>>(new Set());
  const ctxRef = useRef<AudioContext | null>(null);

  const playSiren = () => {
    try {
      const Ctx: any = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!Ctx) return;
      if (!ctxRef.current) ctxRef.current = new Ctx();
      const ctx = ctxRef.current!;
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});

      const now = ctx.currentTime;
      const dur = SIREN_DURATION_SEC;

      // Master gain — loud
      const master = ctx.createGain();
      master.gain.setValueAtTime(0.0001, now);
      master.gain.exponentialRampToValueAtTime(1.0, now + 0.05);
      master.gain.setValueAtTime(1.0, now + dur - 0.1);
      master.gain.exponentialRampToValueAtTime(0.0001, now + dur);
      master.connect(ctx.destination);

      // Two oscillators sweeping like an emergency siren
      const osc1 = ctx.createOscillator();
      osc1.type = 'sawtooth';
      const osc2 = ctx.createOscillator();
      osc2.type = 'square';

      // Sweep frequency back and forth (siren wail) every 0.6s
      const sweepPeriod = 0.6;
      for (let t = 0; t < dur; t += sweepPeriod) {
        osc1.frequency.setValueAtTime(700, now + t);
        osc1.frequency.linearRampToValueAtTime(1400, now + t + sweepPeriod / 2);
        osc1.frequency.linearRampToValueAtTime(700, now + t + sweepPeriod);

        osc2.frequency.setValueAtTime(900, now + t);
        osc2.frequency.linearRampToValueAtTime(1700, now + t + sweepPeriod / 2);
        osc2.frequency.linearRampToValueAtTime(900, now + t + sweepPeriod);
      }

      osc1.connect(master);
      osc2.connect(master);
      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + dur);
      osc2.stop(now + dur);
    } catch (e) {
      console.warn('[LateSiren] play failed', e);
    }
  };

  useEffect(() => {
    if (!enabled) return;

    const check = () => {
      const now = Date.now();
      orders.forEach(o => {
        if (o.status !== 'pending' && o.status !== 'preparing') return;
        const minutes = (now - parseDate(o.created_at).getTime()) / 60000;
        if (minutes >= LATE_THRESHOLD_MIN && !announcedRef.current.has(o.id)) {
          announcedRef.current.add(o.id);
          playSiren();
        }
      });

      // Cleanup ids no longer in active list
      const activeIds = new Set(orders.map(o => o.id));
      announcedRef.current.forEach(id => {
        if (!activeIds.has(id)) announcedRef.current.delete(id);
      });
    };

    check();
    const id = setInterval(check, 5000);
    return () => clearInterval(id);
  }, [orders, enabled]);
}
