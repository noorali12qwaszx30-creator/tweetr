import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { numberToArabicWords } from '@/lib/formatNumber';

// Module-level audio unlock state shared across all hook instances.
let _audioUnlocked = false;
const _unlockListeners = new Set<() => void>();
function _setUnlocked(v: boolean) {
  if (_audioUnlocked === v) return;
  _audioUnlocked = v;
  _unlockListeners.forEach(l => l());
}
function _subscribe(l: () => void) {
  _unlockListeners.add(l);
  return () => _unlockListeners.delete(l);
}
function _getSnapshot() { return _audioUnlocked; }

// Arabic TTS using ElevenLabs via edge function (high quality)
// Caches audio per text and queues playback sequentially.
// Falls back to the browser's SpeechSynthesis API when ElevenLabs is unavailable
// (e.g. quota exhausted / 401), so kitchen announcements are NEVER silently dropped.
export function useArabicSpeech() {
  const queueRef = useRef<string[]>([]);
  const playingRef = useRef(false);
  const cacheRef = useRef<Map<string, string>>(new Map()); // text -> data URI
  const lastSpokenRef = useRef<Map<string, number>>(new Map());
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const elevenlabsBrokenRef = useRef(false); // once 401/quota, stop wasting calls
  const audioUnlocked = useSyncExternalStore(_subscribe, _getSnapshot, _getSnapshot);

  // Try a silent play to detect if audio is actually unlocked by the browser.
  const probeUnlock = useCallback(async () => {
    try {
      const a = new Audio(
        'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQxAADB8AhSmxhIIEVCSiJrDCQBTcu3UrAIwUdkRgQbFAZC1CQEwTJ9mjRvBA4UOLD8nKVOWfh+UlK3z/177OXrfOdKl7097v...'
      );
      a.muted = true;
      a.volume = 0;
      await a.play();
      a.pause();
      return true;
    } catch {
      return false;
    }
  }, []);

  const unlockAudio = useCallback(async () => {
    try {
      // 1) Unlock HTMLAudio
      const a = new Audio();
      a.muted = true;
      try { await a.play(); } catch {}
      try { a.pause(); } catch {}
      // 2) Unlock WebAudio context (some platforms need this)
      try {
        const Ctx: any = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (Ctx) {
          const ctx = new Ctx();
          if (ctx.state === 'suspended') await ctx.resume();
          const buffer = ctx.createBuffer(1, 1, 22050);
          const src = ctx.createBufferSource();
          src.buffer = buffer;
          src.connect(ctx.destination);
          src.start(0);
        }
      } catch {}
      // 3) Unlock SpeechSynthesis (Chrome requires a user-initiated speak)
      try {
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
          const u = new SpeechSynthesisUtterance(' ');
          u.volume = 0;
          window.speechSynthesis.speak(u);
        }
      } catch {}
      _setUnlocked(true);
    } catch (e) {
      console.warn('[ArabicSpeech] unlock failed', e);
    }
  }, []);

  // Auto-detect if audio is already unlocked (e.g. user already interacted on this tab)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ok = await probeUnlock();
      if (!cancelled && ok) {
        _setUnlocked(true);
      }
    })();
    return () => { cancelled = true; };
  }, [probeUnlock]);

  const fetchAudio = useCallback(async (text: string): Promise<string | null> => {
    if (cacheRef.current.has(text)) return cacheRef.current.get(text)!;
    if (elevenlabsBrokenRef.current) return null;
    try {
      const { data, error } = await supabase.functions.invoke('tts-arabic', {
        body: { text },
      });
      if (error) {
        console.error('[ArabicSpeech] TTS invoke error', error);
        elevenlabsBrokenRef.current = true;
        return null;
      }
      if (data?.fallback || !data?.audioContent) {
        console.warn('[ArabicSpeech] Falling back to browser speech', data?.error || 'No audio returned');
        // Mark broken so we instantly fall back to Web Speech for the rest of the session.
        elevenlabsBrokenRef.current = true;
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
      elevenlabsBrokenRef.current = true;
      return null;
    }
  }, []);

  const speakWithBrowser = useCallback((text: string): Promise<void> => {
    return new Promise(resolve => {
      try {
        if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
          resolve();
          return;
        }
        const synth = window.speechSynthesis;
        const utter = new SpeechSynthesisUtterance(text);
        utter.lang = 'ar-SA';
        utter.rate = 1;
        utter.pitch = 1;
        utter.volume = 1;
        // Try to pick an Arabic voice if available
        const voices = synth.getVoices();
        const arVoice = voices.find(v => v.lang?.toLowerCase().startsWith('ar'));
        if (arVoice) utter.voice = arVoice;
        utter.onend = () => resolve();
        utter.onerror = () => resolve();
        // Some browsers queue utterances; cancel any stuck one first
        synth.speak(utter);
        // Safety timeout in case onend never fires
        setTimeout(() => resolve(), Math.max(3000, text.length * 120));
      } catch {
        resolve();
      }
    });
  }, []);

  const processQueue = useCallback(async () => {
    if (playingRef.current || queueRef.current.length === 0) return;
    const text = queueRef.current.shift();
    if (!text) return;

    playingRef.current = true;
    const url = await fetchAudio(text);
    if (!url) {
      // Fallback: use the browser's built-in Arabic TTS so the kitchen still hears it.
      await speakWithBrowser(text);
      playingRef.current = false;
      setTimeout(processQueue, 150);
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
      // Last resort fallback
      await speakWithBrowser(text);
      playingRef.current = false;
      setTimeout(processQueue, 150);
    }
  }, [fetchAudio, speakWithBrowser]);

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
    (
      event: 'new' | 'edited' | 'late' | 'cancelled' | 'issue',
      orderNumber: number | string,
      details?: string,
    ) => {
      const n = parseInt(String(orderNumber).replace(/\D/g, ''), 10) || 0;
      const num = numberToArabicWords(n);
      const detailsText = details ? `، ${details}` : '';
      const messages: Record<typeof event, { text: string; key: string }> = {
        new: { text: `طلب جديد، رقم ${num}`, key: `new-${num}` },
        edited: {
          text: `تنبيه، تم تعديل الطلب رقم ${num}${detailsText}، يرجى المراجعة`,
          // include a hash of details so successive distinct edits aren't deduped
          key: `edited-${num}-${(details || '').slice(0, 40)}`,
        },
        late: { text: `تأخير، الطلب رقم ${num} تجاوز نصف ساعة`, key: `late-${num}` },
        cancelled: { text: `تم إلغاء الطلب رقم ${num}`, key: `cancelled-${num}` },
        issue: { text: `بلاغ على الطلب رقم ${num}`, key: `issue-${num}` },
      };
      const msg = messages[event];
      speak(msg.text, msg.key);
    },
    [speak]
  );

  return { speak, speakOrderEvent, audioUnlocked, unlockAudio };
}
