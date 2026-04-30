import { useEffect, useRef } from 'react';
import { OrderWithItems } from '@/hooks/useSupabaseOrders';
import { useArabicSpeech } from '@/hooks/useArabicSpeech';

function diffEditDetails(prev: OrderWithItems, next: OrderWithItems): string {
  const prevMap = new Map<string, number>();
  prev.items.forEach(it => {
    prevMap.set(it.menu_item_name, (prevMap.get(it.menu_item_name) || 0) + it.quantity);
  });
  const nextMap = new Map<string, number>();
  next.items.forEach(it => {
    nextMap.set(it.menu_item_name, (nextMap.get(it.menu_item_name) || 0) + it.quantity);
  });

  const added: string[] = [];
  const removed: string[] = [];
  const changed: string[] = [];

  nextMap.forEach((qty, name) => {
    const before = prevMap.get(name) || 0;
    if (before === 0) added.push(name);
    else if (qty > before) changed.push(`زيادة ${name}`);
    else if (qty < before) changed.push(`تقليل ${name}`);
  });
  prevMap.forEach((_qty, name) => {
    if (!nextMap.has(name)) removed.push(name);
  });

  const parts: string[] = [];
  if (added.length && removed.length) {
    // Treat as a swap when one item replaced another
    if (added.length === 1 && removed.length === 1) {
      parts.push(`تبديل ${removed[0]} بـ ${added[0]}`);
    } else {
      parts.push(`إضافة ${added.join(' و ')}`);
      parts.push(`حذف ${removed.join(' و ')}`);
    }
  } else {
    if (added.length) parts.push(`إضافة ${added.join(' و ')}`);
    if (removed.length) parts.push(`حذف ${removed.join(' و ')}`);
  }
  if (changed.length) parts.push(changed.join(' و '));

  return parts.join('، ');
}

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
        speakOrderEvent('new', order.order_number);
      }

      if (prevOrder) {
        // Edited — announce on each new edit (use edited_at to detect repeats)
        const wasEdited =
          (!prevOrder.is_edited && order.is_edited) ||
          (order.is_edited && prevOrder.edited_at !== order.edited_at);
        if (wasEdited) {
          const details = diffEditDetails(prevOrder, order);
          speakOrderEvent('edited', order.order_number, details);
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
