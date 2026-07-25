/** Work week: Monday → Saturday (matches labels like "20-25/7"). */

export interface WeekInfo {
  /** Monday YYYY-MM-DD */
  weekStart: string;
  weekLabel: string;
  weekOfMonth: number;
  month: number;
  year: number;
  start: Date;
  end: Date;
}

function atLocalMidnight(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function startOfWeek(date: Date = new Date()): Date {
  const d = atLocalMidnight(date);
  const day = d.getDay(); // Sun=0 … Sat=6
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseIsoDate(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!m) return null;
  const date = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

/** Week-of-month with Monday-start weeks (Jul 20 2026 → 4). */
export function weekOfMonth(date: Date): number {
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const offset = (first.getDay() + 6) % 7; // Mon=0
  return Math.floor((date.getDate() + offset - 1) / 7) + 1;
}

export function formatWeekLabel(monday: Date): string {
  const saturday = addDays(monday, 5);
  const w = weekOfMonth(monday);
  const month = monday.getMonth() + 1;
  const sameMonth = monday.getMonth() === saturday.getMonth();
  const range = sameMonth
    ? `${monday.getDate()}-${saturday.getDate()}/${month}`
    : `${monday.getDate()}/${month}-${saturday.getDate()}/${saturday.getMonth() + 1}`;
  return `Tuần ${w} Tháng ${month} (${range})`;
}

export function getWeekInfo(date: Date = new Date()): WeekInfo {
  const start = startOfWeek(date);
  const end = addDays(start, 5);
  return {
    weekStart: toIsoDate(start),
    weekLabel: formatWeekLabel(start),
    weekOfMonth: weekOfMonth(start),
    month: start.getMonth() + 1,
    year: start.getFullYear(),
    start,
    end
  };
}

export function resolveWeekStart(raw: unknown): WeekInfo {
  if (typeof raw === "string" && raw.trim()) {
    const parsed = parseIsoDate(raw);
    if (parsed) return getWeekInfo(parsed);
  }
  return getWeekInfo();
}

/** List of weeks around a center week for the picker. */
export function listWeeksAround(center: Date, past = 8, future = 4): WeekInfo[] {
  const base = startOfWeek(center);
  const weeks: WeekInfo[] = [];
  for (let i = -past; i <= future; i++) {
    weeks.push(getWeekInfo(addDays(base, i * 7)));
  }
  return weeks;
}
