import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';

export interface UpdateInfo {
  currentBuild: number;
  latestBuild: number;
  apkUrl: string | null;
  releaseUrl: string;
  notes: string;
  mandatory: boolean;
}

const CHECK_INTERVAL = 5 * 60_000; // 5 دقائق

let cachedInfo: UpdateInfo | null = null;
const listeners = new Set<(info: UpdateInfo | null) => void>();

function notify(info: UpdateInfo | null) {
  cachedInfo = info;
  listeners.forEach((l) => l(info));
}

function getRepo(): string | null {
  const repo = (import.meta.env.VITE_GITHUB_REPO as string | undefined)?.trim();
  return repo && repo.includes('/') ? repo : null;
}

function getCurrentBuild(): number {
  return Number(import.meta.env.VITE_APP_BUILD ?? 0) || 0;
}

function parseBuildFromTag(tag: string): number {
  const m = tag.match(/(\d+)/);
  return m ? Number(m[1]) : 0;
}

async function checkLatest(): Promise<void> {
  const repo = getRepo();
  if (!repo) return;
  const currentBuild = getCurrentBuild();
  if (!currentBuild) return; // غير محقون → بناء محلي، تجاهل

  try {
    const res = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, {
      headers: { Accept: 'application/vnd.github+json' },
      cache: 'no-store',
    });
    if (!res.ok) return;
    const data = await res.json();
    const tag: string = data.tag_name ?? '';
    const latestBuild = parseBuildFromTag(tag);
    if (!latestBuild) return;

    const apkAsset = (data.assets ?? []).find((a: any) =>
      typeof a.name === 'string' && a.name.toLowerCase().endsWith('.apk'),
    );

    if (latestBuild > currentBuild) {
      notify({
        currentBuild,
        latestBuild,
        apkUrl: apkAsset?.browser_download_url ?? null,
        releaseUrl: data.html_url ?? `https://github.com/${repo}/releases/latest`,
        notes: data.body ?? '',
        mandatory: true,
      });
    } else {
      notify(null);
    }
  } catch {
    // ignore
  }
}

/** يبدأ الفحص الدوري (يُستدعى مرة واحدة في الجذر). */
export function useForceUpdateChecker() {
  useEffect(() => {
    // فقط على Android الأصلي
    if (!Capacitor.isNativePlatform()) return;

    checkLatest();
    const interval = setInterval(checkLatest, CHECK_INTERVAL);
    const onVisible = () => {
      if (document.visibilityState === 'visible') checkLatest();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);
}

/** يستهلك حالة التحديث. */
export function useForceUpdateInfo(): UpdateInfo | null {
  const [info, setInfo] = useState<UpdateInfo | null>(cachedInfo);
  useEffect(() => {
    listeners.add(setInfo);
    return () => {
      listeners.delete(setInfo);
    };
  }, []);
  return info;
}