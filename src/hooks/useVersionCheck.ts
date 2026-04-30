import { useEffect, useRef } from 'react';
import { toast } from 'sonner';

// يفحص index.html من الخادم بشكل دوري لاكتشاف وجود نسخة جديدة من التطبيق.
// عند اكتشاف تغيير في ملفات الـ build، يعرض إشعاراً للمستخدم لإعادة التحميل.
const CHECK_INTERVAL = 60_000; // كل دقيقة

async function fetchCurrentBuildHash(): Promise<string | null> {
  try {
    const res = await fetch('/index.html', {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' },
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

export function useVersionCheck() {
  const initialHashRef = useRef<string | null>(null);
  const notifiedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      const hash = await fetchCurrentBuildHash();
      if (cancelled || !hash) return;

      if (initialHashRef.current === null) {
        initialHashRef.current = hash;
        return;
      }

      if (hash !== initialHashRef.current && !notifiedRef.current) {
        notifiedRef.current = true;
        toast.info('يتوفر تحديث جديد للنظام', {
          description: 'اضغط لإعادة التحميل وتطبيق التحديث',
          duration: Infinity,
          action: {
            label: 'تحديث الآن',
            onClick: () => {
              // تنظيف caches ثم إعادة تحميل قسرية
              const reload = () => window.location.reload();
              if ('caches' in window) {
                caches.keys()
                  .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
                  .finally(reload);
              } else {
                reload();
              }
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

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);
}