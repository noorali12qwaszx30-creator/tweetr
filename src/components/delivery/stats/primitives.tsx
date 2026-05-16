import { useEffect, useRef, useState, ReactNode } from 'react';
import { toEnglishNumbers, formatNumberWithCommas } from '@/lib/formatNumber';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

/* ---------- Animated counter ---------- */
export function AnimatedCounter({
  value,
  format = 'comma',
  duration = 800,
  className = '',
}: {
  value: number;
  format?: 'comma' | 'plain';
  duration?: number;
  className?: string;
}) {
  const [display, setDisplay] = useState(0);
  const startRef = useRef<number | null>(null);
  const fromRef = useRef(0);

  useEffect(() => {
    fromRef.current = display;
    startRef.current = null;
    let raf = 0;
    const step = (t: number) => {
      if (startRef.current === null) startRef.current = t;
      const p = Math.min(1, (t - startRef.current) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(fromRef.current + (value - fromRef.current) * eased));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);

  const text = format === 'comma' ? formatNumberWithCommas(display) : toEnglishNumbers(display);
  return <span className={className}>{text}</span>;
}

/* ---------- Trend pill ---------- */
export function TrendPill({ current, previous }: { current: number; previous: number }) {
  let icon: ReactNode;
  let cls = '';
  let label = '';
  if (previous === 0) {
    if (current === 0) {
      icon = <Minus className="w-3 h-3" />;
      cls = 'text-muted-foreground bg-muted/40';
      label = '—';
    } else {
      icon = <TrendingUp className="w-3 h-3" />;
      cls = 'text-emerald-700 dark:text-emerald-400 bg-emerald-500/15';
      label = 'جديد';
    }
  } else {
    const diff = ((current - previous) / previous) * 100;
    if (Math.abs(diff) < 1) {
      icon = <Minus className="w-3 h-3" />;
      cls = 'text-muted-foreground bg-muted/40';
      label = 'مستقر';
    } else if (diff > 0) {
      icon = <TrendingUp className="w-3 h-3" />;
      cls = 'text-emerald-700 dark:text-emerald-400 bg-emerald-500/15';
      label = `+${toEnglishNumbers(Math.round(diff))}%`;
    } else {
      icon = <TrendingDown className="w-3 h-3" />;
      cls = 'text-rose-700 dark:text-rose-400 bg-rose-500/15';
      label = `${toEnglishNumbers(Math.round(diff))}%`;
    }
  }
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold ${cls}`}>
      {icon}
      {label}
    </span>
  );
}

/* ---------- Stat Card ---------- */
type Tone = 'emerald' | 'sky' | 'amber' | 'rose' | 'violet' | 'orange';
const TONE: Record<Tone, { bg: string; border: string; iconBg: string; text: string }> = {
  emerald: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    border: 'border-emerald-500/40',
    iconBg: 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400',
    text: 'text-emerald-600 dark:text-emerald-400',
  },
  sky: {
    bg: 'bg-sky-50 dark:bg-sky-950/30',
    border: 'border-sky-500/40',
    iconBg: 'bg-sky-500/20 text-sky-600 dark:text-sky-400',
    text: 'text-sky-600 dark:text-sky-400',
  },
  amber: {
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    border: 'border-amber-500/40',
    iconBg: 'bg-amber-500/20 text-amber-600 dark:text-amber-400',
    text: 'text-amber-600 dark:text-amber-400',
  },
  rose: {
    bg: 'bg-rose-50 dark:bg-rose-950/30',
    border: 'border-rose-500/40',
    iconBg: 'bg-rose-500/20 text-rose-600 dark:text-rose-400',
    text: 'text-rose-600 dark:text-rose-400',
  },
  violet: {
    bg: 'bg-violet-50 dark:bg-violet-950/30',
    border: 'border-violet-500/40',
    iconBg: 'bg-violet-500/20 text-violet-600 dark:text-violet-400',
    text: 'text-violet-600 dark:text-violet-400',
  },
  orange: {
    bg: 'bg-orange-50 dark:bg-orange-950/30',
    border: 'border-orange-500/40',
    iconBg: 'bg-orange-500/20 text-orange-600 dark:text-orange-400',
    text: 'text-orange-600 dark:text-orange-400',
  },
};

export function StatCard({
  icon,
  label,
  value,
  suffix,
  hint,
  trend,
  tone = 'sky',
  format = 'comma',
  delay = 0,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  suffix?: string;
  hint?: ReactNode;
  trend?: { current: number; previous: number };
  tone?: Tone;
  format?: 'comma' | 'plain';
  delay?: number;
}) {
  const t = TONE[tone];
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border-2 ${t.bg} ${t.border} p-3 shadow-soft min-h-[118px] flex flex-col justify-between animate-fade-in`}
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'backwards' }}
    >
      <div className="flex items-center justify-between">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${t.iconBg}`}>{icon}</div>
        {trend && <TrendPill current={trend.current} previous={trend.previous} />}
      </div>
      <div>
        <p className="text-[11px] text-muted-foreground leading-none mb-1">{label}</p>
        <p className={`text-2xl font-extrabold leading-tight ${t.text}`}>
          <AnimatedCounter value={value} format={format} />
          {suffix && <span className="text-sm font-semibold mr-1">{suffix}</span>}
        </p>
        {hint && <p className="text-[10px] text-muted-foreground mt-0.5">{hint}</p>}
      </div>
    </div>
  );
}

/* ---------- Progress Ring ---------- */
export function ProgressRing({
  value,
  size = 88,
  stroke = 8,
  color = 'rgb(16 185 129)',
  trackColor = 'hsl(var(--muted))',
  children,
}: {
  value: number; // 0-100
  size?: number;
  stroke?: number;
  color?: string;
  trackColor?: string;
  children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.max(0, Math.min(100, value)) / 100) * c;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke={trackColor} strokeWidth={stroke} fill="none" opacity={0.25} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 800ms ease-out' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}

/* ---------- Mini Bar Chart ---------- */
export function MiniBarChart({
  data,
  highlightIndex,
  height = 90,
  color = 'rgb(249 115 22)',
}: {
  data: { label: string; value: number }[];
  highlightIndex?: number;
  height?: number;
  color?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="w-full">
      <div className="flex items-end justify-between gap-1" style={{ height }}>
        {data.map((d, i) => {
          const h = (d.value / max) * 100;
          const isMax = i === highlightIndex;
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1 min-w-0">
              <div className="w-full flex items-end" style={{ height: '100%' }}>
                <div
                  className="w-full rounded-t-md transition-all duration-700"
                  style={{
                    height: `${h}%`,
                    background: isMax ? color : `${color}66`,
                    minHeight: d.value > 0 ? 4 : 0,
                  }}
                  title={`${d.label}: ${d.value}`}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between gap-1 mt-1">
        {data.map((d, i) => (
          <span key={i} className="flex-1 text-center text-[9px] text-muted-foreground">
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ---------- HeatMap 24 hours ---------- */
export function HeatMapHours({ hourly }: { hourly: number[] }) {
  const max = Math.max(1, ...hourly);
  return (
    <div className="grid grid-cols-12 gap-1">
      {hourly.map((v, h) => {
        const intensity = v / max;
        const bg =
          v === 0
            ? 'rgba(148,163,184,0.15)'
            : `rgba(249, 115, 22, ${0.2 + intensity * 0.8})`;
        return (
          <div
            key={h}
            className="aspect-square rounded-md flex items-center justify-center text-[9px] font-bold"
            style={{ background: bg, color: intensity > 0.5 ? 'white' : 'inherit' }}
            title={`${h}:00 — ${v} طلب`}
          >
            {toEnglishNumbers(h)}
          </div>
        );
      })}
    </div>
  );
}