const HOUR = 3600e3;
const DAY = 24 * HOUR;
const JST_OFFSET = 9 * HOUR;

/** リセット時刻を区切りにした「ゲーム内の日付」（日本時間） */
export function dayKey(now: Date, resetHour: number): string {
  return new Date(now.getTime() + JST_OFFSET - resetHour * HOUR).toISOString().slice(0, 10);
}

export function shiftDayKey(key: string, days: number): string {
  return new Date(Date.parse(key) + days * DAY).toISOString().slice(0, 10);
}

/** 「あと○日」「あと○時間」 */
export function remaining(end: string, now: Date): string {
  const ms = Date.parse(end) - now.getTime();
  if (ms <= 0) return '終了';
  if (ms >= DAY) return `あと${Math.floor(ms / DAY)}日`;
  return `あと${Math.max(1, Math.ceil(ms / HOUR))}時間`;
}

const fmt = new Intl.DateTimeFormat('ja-JP', {
  timeZone: 'Asia/Tokyo',
  month: 'numeric',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export function formatDateTime(iso: string): string {
  return fmt.format(new Date(iso));
}

const fmtDate = new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', month: 'numeric', day: 'numeric' });

export function formatDate(iso: string): string {
  return fmtDate.format(new Date(iso));
}

export function startOfLocalDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export { DAY };
