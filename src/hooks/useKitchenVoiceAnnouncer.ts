import { useEffect, useRef } from 'react';
import { OrderWithItems } from '@/hooks/useSupabaseOrders';
import { useArabicSpeech } from '@/hooks/useArabicSpeech';

// Watches kitchen orders and announces events in Arabic via TTS
export function useKitchenVoiceAnnouncer(orders: OrderWithItems[]) {
  const { speakOrderEvent } = useArabicSpeech();
  const prevOrdersRef = useRef<Map<string, OrderWithItems>>(new Map());
  const initializedRef = useRef(false);
  const announcedLateRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const currentMap = new Map(orders.map(o => [o.id, o]));

    // First load: don't announce existing orders, just snapshot
    if (!initializedRef.current) {
      prevOrdersRef.current = currentMap;
      initializedRef.current = true;
      return;
    }

    const prev = prevOrdersRef.current;

    orders.forEach(order => {
      const prevOrder = prev.get(order.id);

      // New order (only kitchen-relevant statuses)
      if (!prevOrder && (order.status === 'pending' || order.status === 'preparing')) {
        console.log('[KitchenVoice] New order detected:', order.order_number);
        speakOrderEvent('new', order.order_number);
      }

      if (prevOrder) {
        // Edited
        if (!prevOrder.is_edited && order.is_edited) {
          console.log('[KitchenVoice] Edited order detected:', order.order_number);
          speakOrderEvent('edited', order.order_number);
        }
        // Cancelled
        if (prevOrder.status !== 'cancelled' && order.status === 'cancelled') {
          speakOrderEvent('cancelled', order.order_number);
        }
        // Issue reported
        if (!prevOrder.has_issue && order.has_issue) {
          speakOrderEvent('issue', order.order_number);
        }
      }
    });

    prevOrdersRef.current = currentMap;
  }, [orders, speakOrderEvent]);

  // Late orders (>30 min) - announce once per order
  useEffect(() => {
    const checkLate = () => {
      const now = Date.now();
      orders.forEach(o => {
        if (o.status !== 'preparing' && o.status !== 'pending') return;
        const created = new Date(
          o.created_at.endsWith('Z') || o.created_at.includes('+')
            ? o.created_at
            : o.created_at + 'Z'
        );
        const minutes = (now - created.getTime()) / 60000;
        if (minutes >= 30 && !announcedLateRef.current.has(o.id)) {
          announcedLateRef.current.add(o.id);
          speakOrderEvent('late', o.order_number);
        }
      });

      // Cleanup announcements for orders that left the active list
      const activeIds = new Set(orders.map(o => o.id));
      announcedLateRef.current.forEach(id => {
        if (!activeIds.has(id)) announcedLateRef.current.delete(id);
      });
    };

    checkLate();
    const id = setInterval(checkLate, 10000);
    return () => clearInterval(id);
  }, [orders, speakOrderEvent]);
}
