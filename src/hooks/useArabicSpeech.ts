import { useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toEnglishNumbers } from '@/lib/formatNumber';

// Arabic TTS using ElevenLabs via edge function (high quality)
// Caches audio per text and queues playback sequentially.
export function useArabicSpeech() {
  const queueRef = useRef<string[]>([]);
  const playingRef = useRef(false);
  const cacheRef = useRef<Map<string, string>>(new Map()); // text -> data URI
  const lastSpokenRef = useRef<Map<string, number>>(new Map());
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const fetchAudio = useCallback(async (text: string): Promise<string | null> => {
    if (cacheRef.current.has(text)) return cacheRef.current.get(text)!;
    try {
      const { data, error } = await supabase.functions.invoke('tts-arabic', {
        body: { text },
      });
      if (error || !data?.audioContent) {
        console.error('[ArabicSpeech] TTS error', error);
        return null;
      }
      const url = `data:audio/mpeg;base64,${data.audioContent}`;
      cacheRef.current.set(text, url);
      // Trim cache if too large
      if (cacheRef.current.size > 50) {
        const firstKey = cacheRef.current.keys().next().value;
        if (firstKey) cacheRef.current.delete(firstKey);
      }
      return url;
    } catch (e) {
      console.error('[ArabicSpeech] fetch failed', e);
      return null;
    }
  }, []);

  const processQueue = useCallback(async () => {
    if (playingRef.current || queueRef.current.length === 0) return;
    const text = queueRef.current.shift();
    if (!text) return;

    playingRef.current = true;
    const url = await fetchAudio(text);
    if (!url) {
      playingRef.current = false;
      setTimeout(processQueue, 100);
      return;
    }

    try {
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.volume = 1;
      audio.onended = () => {
        playingRef.current = false;
        setTimeout(processQueue, 150);
      };
      audio.onerror = () => {
        playingRef.current = false;
        setTimeout(processQueue, 150);
      };
      await audio.play();
    } catch (e) {
      console.error('[ArabicSpeech] play failed', e);
      playingRef.current = false;
      setTimeout(processQueue, 150);
    }
  }, [fetchAudio]);

  const speak = useCallback((text: string, dedupeKey?: string, dedupeWindowMs = 4000) => {
    if (dedupeKey) {
      const now = Date.now();
      const last = lastSpokenRef.current.get(dedupeKey) || 0;
      if (now - last < dedupeWindowMs) return;
      lastSpokenRef.current.set(dedupeKey, now);
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
        late: { text: `تأخير، الطلب رقم ${num} تجاوز نصف ساعة`, key: `late-${num}` },
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
