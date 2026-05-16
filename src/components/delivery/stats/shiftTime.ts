// Operational shift starts at 11:00 AM Baghdad time and ends 11:00 AM next day
export const SHIFT_START_HOUR = 11;

export function startOfCurrentShift(now: Date = new Date()): Date {
  const start = new Date(now);
  start.setHours(SHIFT_START_HOUR, 0, 0, 0);
  if (now.getTime() < start.getTime()) start.setDate(start.getDate() - 1);
  return start;
}

export function isInCurrentShift(date: string | Date): boolean {
  const d = typeof date === 'string' ? new Date(date).getTime() : date.getTime();
  const s = startOfCurrentShift().getTime();
  return d >= s && d < s + 24 * 3600 * 1000;
}

export function isInPreviousShift(date: string | Date): boolean {
  const d = typeof date === 'string' ? new Date(date).getTime() : date.getTime();
  const s = startOfCurrentShift().getTime();
  return d >= s - 24 * 3600 * 1000 && d < s;
}

export function isWithinDays(date: string | Date, days: number): boolean {
  const d = typeof date === 'string' ? new Date(date).getTime() : date.getTime();
  return d >= Date.now() - days * 24 * 3600 * 1000;
}

export function isThisMonth(date: string | Date): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

export function isThisYear(date: string | Date): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.getFullYear() === new Date().getFullYear();
}