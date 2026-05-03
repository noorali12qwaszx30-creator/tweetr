import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';

// يفحص index.html من الخادم بشكل دوري لاكتشاف وجود نسخة جديدة من التطبيق.
// عند اكتشاف تغيير في ملفات الـ build، يعرض إشعاراً للمستخدم لإعادة التحميل.
const CHECK_INTERVAL = 60_000; // كل دقيقة
const RELOAD_GUARD_KEY = 'lv-version-reload-target';

async function fetchCurrentBuildHash(): Promise<string | null> {
  try {
    const url = new URL('/index.html', window.location.origin);
    url.searchParams.set('_lv', Date.now().toString());

    const res = await fetch(url.toString(), {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    });
    if (!res.ok) return null;
    const html = await res.text();
    // نلتقط مرجع ملف الـ JS الرئيسي (يتغير hash مع كل build)
    const match = html.match(/\/assets\/index-[A-Za-z0-9_-]+\.js/);
    return match ? match[0] : html.length.toString();
  } catch {
    return null;
  }
}

function getLoadedBuildHash(): string | null {
  const currentScript = Array.from(document.scripts).find((script) => {
    const src = script.getAttribute('src') ?? '';
    return /\/assets\/index-[A-Za-z0-9_-]+\.js/.test(src);
  });

  const src = currentScript?.getAttribute('src') ?? null;
  if (!src) return null;

  const match = src.match(/\/assets\/index-[A-Za-z0-9_-]+\.js/);
  return match ? match[0] : null;
}

function buildCacheBustedUrl() {
  const url = new URL(window.location.href);
  url.searchParams.set('_lv_reload', Date.now().toString());
  return url.toString();
}

function forceHardReload(targetHash: string) {
  const lastReloadTarget = sessionStorage.getItem(RELOAD_GUARD_KEY);
  if (lastReloadTarget === targetHash) return;

  sessionStorage.setItem(RELOAD_GUARD_KEY, targetHash);

  const reload = () => {
    window.location.replace(buildCacheBustedUrl());
  };

  if ('caches' in window) {
    caches.keys()
      .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      .finally(reload);
    return;
  }

  reload();
}

export function useVersionCheck() {
  const loadedHashRef = useRef<string | null>(null);
  const notifiedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      const latestHash = await fetchCurrentBuildHash();
      if (cancelled || !latestHash) return;

      if (loadedHashRef.current === null) {
        loadedHashRef.current = getLoadedBuildHash();
      }

      const loadedHash = loadedHashRef.current;
      if (!loadedHash) {
        loadedHashRef.current = latestHash;
        return;
      }

      if (latestHash === loadedHash) {
        sessionStorage.removeItem(RELOAD_GUARD_KEY);
        return;
      }

      if (!notifiedRef.current) {
        notifiedRef.current = true;

        if (Capacitor.isNativePlatform()) {
          forceHardReload(latestHash);
          return;
        }

        // Auto-reload after 8 seconds for unattended screens (e.g. kitchen)
        const autoReloadTimer = window.setTimeout(() => {
          forceHardReload(latestHash);
        }, 8000);

        toast.info('يتوفر تحديث جديد للنظام', {
          description: 'اضغط لإعادة التحميل وتطبيق التحديث',
          duration: Infinity,
          action: {
            label: 'تحديث الآن',
            onClick: () => {
              window.clearTimeout(autoReloadTimer);
              forceHardReload(latestHash);
            },
          },
        });
      }
    };

    check();
    const interval = setInterval(check, CHECK_INTERVAL);

    // افحص أيضاً عند العودة إلى التبويب
    const onVisible = () => {
      if (document.visibilityState === 'visible') check();
    };
    document.addEventListener('visibilitychange', onVisible);

    let removeAppStateListener: (() => void) | undefined;
    let removeResumeListener: (() => void) | undefined;
    if (Capacitor.isNativePlatform()) {
      (async () => {
        try {
          const stateListener = await CapApp.addListener('appStateChange', ({ isActive }) => {
            if (isActive) check();
          });
          removeAppStateListener = () => stateListener.remove();

          const resumeListener = await CapApp.addListener('resume', () => {
            check();
          });
          removeResumeListener = () => resumeListener.remove();
        } catch {
          // ignore
        }
      })();
    }

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
      removeAppStateListener?.();
      removeResumeListener?.();
    };
  }, []);
}