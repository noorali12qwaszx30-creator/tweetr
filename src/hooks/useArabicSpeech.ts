import { useCallback, useRef } from 'react';
import { toEnglishNumbers } from '@/lib/formatNumber';

// Arabic Text-to-Speech using browser's Web Speech API (free, no API key)
export function useArabicSpeech() {
  const queueRef = useRef<string[]>([]);
  const speakingRef = useRef(false);
  const lastSpokenRef = useRef<Map<string, number>>(new Map());

  const processQueue = useCallback(() => {
    if (speakingRef.current || queueRef.current.length === 0) return;
    const text = queueRef.current.shift();
    if (!text) return;

    try {
      const synth = window.speechSynthesis;
      if (!synth) return;

      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = 'ar-SA';
      utter.rate = 0.95;
      utter.pitch = 1;
      utter.volume = 1;

      // Try to pick an Arabic voice if available
      const voices = synth.getVoices();
      const arabicVoice = voices.find(v => v.lang.startsWith('ar'));
      if (arabicVoice) utter.voice = arabicVoice;

      speakingRef.current = true;
      utter.onend = () => {
        speakingRef.current = false;
        setTimeout(processQueue, 200);
      };
      utter.onerror = () => {
        speakingRef.current = false;
        setTimeout(processQueue, 200);
      };

      synth.speak(utter);
    } catch {
      speakingRef.current = false;
    }
  }, []);

  const speak = useCallback((text: string, dedupeKey?: string, dedupeWindowMs = 4000) => {
    if (!('speechSynthesis' in window)) return;

    // Deduplicate same announcement within a short window
    if (dedupeKey) {
      const now = Date.now();
      const last = lastSpokenRef.current.get(dedupeKey) || 0;
      if (now - last < dedupeWindowMs) return;
      lastSpokenRef.current.set(dedupeKey, now);
      // Cleanup old keys occasionally
      if (lastSpokenRef.current.size > 100) {
        const cutoff = now - 60000;
        lastSpokenRef.current.forEach((t, k) => {
          if (t < cutoff) lastSpokenRef.current.delete(k);
        });
      }
    }

    queueRef.current.push(text);
    processQueue();
  }, [processQueue]);

  const speakOrderEvent = useCallback(
    (event: 'new' | 'edited' | 'late' | 'cancelled' | 'issue', orderNumber: number | string) => {
      const num = toEnglishNumbers(String(orderNumber));
      const messages: Record<typeof event, { text: string; key: string }> = {
        new: { text: `طلب جديد، رقم ${num}`, key: `new-${num}` },
        edited: { text: `تنبيه، تم تعديل الطلب رقم ${num}، يرجى المراجعة`, key: `edited-${num}` },
        late: { text: `تأخير في الطلب رقم ${num}`, key: `late-${num}` },
        cancelled: { text: `تم إلغاء الطلب رقم ${num}`, key: `cancelled-${num}` },
        issue: { text: `بلاغ على الطلب رقم ${num}`, key: `issue-${num}` },
      };
      const msg = messages[event];
      speak(msg.text, msg.key);
    },
    [speak]
  );

  return { speak, speakOrderEvent };
}
