import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { OrderWithItems } from '@/hooks/useSupabaseOrders';

// Kitchen alarm hook - each late order (>30 min) + manual admin trigger
export function useKitchenAlarm(orders: OrderWithItems[]) {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const activeAlarmsRef = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());
  const lateOrderIdsRef = useRef<Set<string>>(new Set());
  const manualAlarmRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const getAudioCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioCtxRef.current;
  }, []);

  // Maximum loudness siren - varies pitch by order index
  const playOrderAlarm = useCallback((orderIndex: number) => {
    try {
      const ctx = getAudioCtx();
      const now = ctx.currentTime;
      const baseFreq = 600 + (orderIndex % 5) * 200;

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const osc3 = ctx.createOscillator();
      const gain = ctx.createGain();
      const distortion = ctx.createWaveShaper();

      const curve = new Float32Array(256);
      for (let i = 0; i < 256; i++) {
        const x = (i * 2) / 256 - 1;
        curve[i] = (Math.PI + 100) * x / (Math.PI + 100 * Math.abs(x));
      }
      distortion.curve = curve;

      osc1.connect(distortion);
      osc2.connect(distortion);
      osc3.connect(distortion);
      distortion.connect(gain);
      gain.connect(ctx.destination);

      osc1.type = 'square';
      osc2.type = 'sawtooth';
      osc3.type = 'triangle';

      // Rapid siren sweep
      osc1.frequency.setValueAtTime(baseFreq, now);
      osc1.frequency.linearRampToValueAtTime(baseFreq + 600, now + 0.15);
      osc1.frequency.linearRampToValueAtTime(baseFreq, now + 0.3);
      osc1.frequency.linearRampToValueAtTime(baseFreq + 600, now + 0.45);
      osc1.frequency.linearRampToValueAtTime(baseFreq, now + 0.6);
      osc1.frequency.linearRampToValueAtTime(baseFreq + 600, now + 0.75);
      osc1.frequency.linearRampToValueAtTime(baseFreq, now + 0.9);

      osc2.frequency.setValueAtTime(baseFreq + 100, now);
      osc2.frequency.linearRampToValueAtTime(baseFreq + 700, now + 0.2);
      osc2.frequency.linearRampToValueAtTime(baseFreq + 100, now + 0.4);
      osc2.frequency.linearRampToValueAtTime(baseFreq + 700, now + 0.6);

      osc3.frequency.setValueAtTime(baseFreq * 2, now);
      osc3.frequency.linearRampToValueAtTime(baseFreq * 3, now + 0.3);
      osc3.frequency.linearRampToValueAtTime(baseFreq * 2, now + 0.6);

      // Max volume pulsing
      gain.gain.setValueAtTime(0.6, now);
      gain.gain.setValueAtTime(0.1, now + 0.1);
      gain.gain.setValueAtTime(0.6, now + 0.2);
      gain.gain.setValueAtTime(0.1, now + 0.3);
      gain.gain.setValueAtTime(0.6, now + 0.4);
      gain.gain.setValueAtTime(0.1, now + 0.5);
      gain.gain.setValueAtTime(0.6, now + 0.6);
      gain.gain.setValueAtTime(0.1, now + 0.7);
      gain.gain.setValueAtTime(0.6, now + 0.8);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.95);

      osc1.start(now);
      osc2.start(now);
      osc3.start(now);
      osc1.stop(now + 0.95);
      osc2.stop(now + 0.95);
      osc3.stop(now + 0.95);
    } catch {}
  }, [getAudioCtx]);

  // Listen for manual admin alarm trigger via Supabase broadcast
  useEffect(() => {
    const channel = supabase.channel('kitchen-alarm-control')
      .on('broadcast', { event: 'alarm-toggle' }, (payload) => {
        const active = payload.payload?.active;
        if (active) {
          if (!manualAlarmRef.current) {
            playOrderAlarm(99);
            manualAlarmRef.current = setInterval(() => playOrderAlarm(99), 1000);
          }
        } else {
          if (manualAlarmRef.current) {
            clearInterval(manualAlarmRef.current);
            manualAlarmRef.current = null;
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (manualAlarmRef.current) {
        clearInterval(manualAlarmRef.current);
        manualAlarmRef.current = null;
      }
    };
  }, [playOrderAlarm]);

  // Late orders alarm - repeats every 1 second per late order
  useEffect(() => {
    const checkAlarms = () => {
      const now = Date.now();
      const currentLateIds = new Set<string>();

      orders.forEach((o) => {
        if (o.status !== 'preparing' && o.status !== 'pending') return;
        const created = new Date(o.created_at.endsWith('Z') || o.created_at.includes('+') ? o.created_at : o.created_at + 'Z');
        const isLate = (now - created.getTime()) / 1000 >= 1800;
        if (isLate) currentLateIds.add(o.id);
      });

      // Start alarms for newly late orders
      currentLateIds.forEach(id => {
        if (!lateOrderIdsRef.current.has(id)) {
          const orderIdx = orders.findIndex(o => o.id === id);
          playOrderAlarm(orderIdx);
          const interval = setInterval(() => playOrderAlarm(orderIdx), 1000);
          activeAlarmsRef.current.set(id, interval);
        }
      });

      // Stop alarms for orders no longer late
      lateOrderIdsRef.current.forEach(id => {
        if (!currentLateIds.has(id)) {
          const interval = activeAlarmsRef.current.get(id);
          if (interval) clearInterval(interval);
          activeAlarmsRef.current.delete(id);
        }
      });

      lateOrderIdsRef.current = currentLateIds;
    };

    checkAlarms();
    const check = setInterval(checkAlarms, 5000);
    return () => {
      clearInterval(check);
      activeAlarmsRef.current.forEach(interval => clearInterval(interval));
      activeAlarmsRef.current.clear();
    };
  }, [orders, playOrderAlarm]);
}
