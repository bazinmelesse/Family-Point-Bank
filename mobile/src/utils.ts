import type { CalEvent, Kid, LogEntry, Settings } from './types';

export const rid = () => Math.random().toString(36).slice(2, 10);

export const rate = (s: Settings) => Math.max(1, Number(s.pointsPerDollar) || 10);
export const money = (points: number, s: Settings) => '$' + (points / rate(s)).toFixed(2);

export const balance = (log: LogEntry[], kidId: string) =>
  log.reduce((sum, e) => (e.kidId === kidId ? sum + (Number(e.points) || 0) : sum), 0);

export const sortKids = (kids: Kid[]) => [...kids].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

export const initial = (name: string) => ((name || '?').trim()[0] || '?').toUpperCase();
export const firstName = (name: string) => String(name).split(' ')[0];

export const REWARD_CATS = { screen: 'Screen time', privilege: 'Privilege', outing: 'Outing', time: 'Time together' } as const;

/* ---------- dates ---------- */
const pad = (n: number) => String(n).padStart(2, '0');

export const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const parseYmd = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const addDays = (s: string, n: number) => {
  const d = parseYmd(s);
  d.setDate(d.getDate() + n);
  return ymd(d);
};

export const todayYmd = () => ymd(new Date());

export const dayLabel = (s: string, opts: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'long', day: 'numeric' }) =>
  parseYmd(s).toLocaleDateString(undefined, opts);

export const relDay = (s: string, today = todayYmd()) => {
  if (s === today) return 'Today';
  if (s === addDays(today, 1)) return 'Tomorrow';
  return dayLabel(s, { weekday: 'short', month: 'short', day: 'numeric' });
};

/** Accepts "15:30", "3:30pm", "3 pm", "330p", "9". Returns "HH:MM", "" for blank, or null when it can't be read. */
export function parseTime(raw: string): string | null {
  const s = raw.trim().toLowerCase().replace(/\s+/g, '').replace(/\./g, '');
  if (!s) return '';
  const m = s.match(/^(\d{1,2})(?::?(\d{2}))?(am|pm|a|p)?$/);
  if (!m) return null;
  let h = Number(m[1]);
  const min = Number(m[2] || 0);
  const ap = m[3];
  if (min > 59) return null;
  if (ap) {
    if (h < 1 || h > 12) return null;
    if (ap.startsWith('p') && h !== 12) h += 12;
    if (ap.startsWith('a') && h === 12) h = 0;
  } else if (h > 23) return null;
  return `${pad(h)}:${pad(min)}`;
}

export function fmtTime(hhmm?: string) {
  if (!hhmm) return '';
  const [h, m] = hhmm.split(':').map(Number);
  const ap = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return m ? `${h12}:${pad(m)} ${ap}` : `${h12} ${ap}`;
}

export const fmtSpan = (e: CalEvent) =>
  e.start ? (e.end ? `${fmtTime(e.start)} – ${fmtTime(e.end)}` : fmtTime(e.start)) : 'All day';

export const REPEATS = { none: 'Once', daily: 'Every day', weekdays: 'Weekdays', weekly: 'Every week' } as const;

export function occursOn(e: CalEvent, day: string) {
  if (day < e.date) return false;
  if (e.until && day > e.until) return false;
  if (e.repeat === 'none') return day === e.date;
  if (e.repeat === 'daily') return true;
  const dow = parseYmd(day).getDay();
  if (e.repeat === 'weekdays') return dow >= 1 && dow <= 5;
  return dow === parseYmd(e.date).getDay();
}

const byTime = (a: CalEvent, b: CalEvent) => (a.start || '').localeCompare(b.start || '') || a.title.localeCompare(b.title);

/** Events on a day. With kidId, only that kid's events (not whole-family ones). */
export function eventsOn(events: CalEvent[], day: string, kidId?: string) {
  return events.filter((e) => occursOn(e, day) && (!kidId || e.kidIds.includes(kidId))).sort(byTime);
}

export const familyEventsOn = (events: CalEvent[], day: string) =>
  events.filter((e) => occursOn(e, day) && e.kidIds.length === 0).sort(byTime);

/**
 * The next few events after `from` for a kid (or the whole family when kidId is null), within `days` days.
 * Each event shows once, and repeating events already happening on `from` are left out, so a daily
 * or weekday routine like school doesn't crowd out everything else.
 */
export function upcoming(events: CalEvent[], kidId: string | null, from: string, days: number, max: number) {
  const out: { day: string; e: CalEvent }[] = [];
  const seen = new Set(events.filter((e) => e.repeat !== 'none' && occursOn(e, from)).map((e) => e.id));
  for (let i = 1; i <= days && out.length < max; i++) {
    const day = addDays(from, i);
    const list = kidId ? eventsOn(events, day, kidId) : familyEventsOn(events, day);
    for (const e of list) {
      if (out.length >= max) break;
      if (seen.has(e.id)) continue;
      seen.add(e.id);
      out.push({ day, e });
    }
  }
  return out;
}

/** True when an event today has already finished. */
export function isOver(e: CalEvent, now: Date) {
  const end = e.end || e.start;
  if (!end) return false;
  const [h, m] = end.split(':').map(Number);
  return now.getHours() * 60 + now.getMinutes() > h * 60 + m + (e.end ? 0 : 60);
}

/* ---------- kid view lock ---------- */
export const LOCKS = {
  math1: 'Easy math, like 7 × 8',
  math2: 'Medium math, like 47 × 6',
  math3: 'Hard math, like 38 × 27',
  math4: 'Very hard math, like 64 × 23 − 158',
  custom: 'My own question',
} as const;

export function makeGate(s: Settings): { q: string; ans: string; text?: boolean } {
  const R = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));
  const t = s.lockType || 'math1';
  if (t === 'custom' && s.lockQ && s.lockA) return { q: s.lockQ, ans: String(s.lockA), text: true };
  if (t === 'math2') { const a = R(12, 99), b = R(3, 9); return { q: `What is ${a} × ${b}?`, ans: String(a * b) }; }
  if (t === 'math3') { const a = R(12, 99), b = R(12, 99); return { q: `What is ${a} × ${b}?`, ans: String(a * b) }; }
  if (t === 'math4') {
    const a = R(12, 99), b = R(12, 99), c = R(100, Math.min(999, a * b - 1));
    return { q: `What is ${a} × ${b} − ${c}?`, ans: String(a * b - c) };
  }
  const a = R(6, 9), b = R(6, 9);
  return { q: `What is ${a} × ${b}?`, ans: String(a * b) };
}

export const normAns = (v: unknown) => String(v ?? '').trim().toLowerCase().replace(/,/g, '').replace(/\s+/g, ' ');
