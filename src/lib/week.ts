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

const SELECTED_WEEK_STORAGE_KEY = "tcgv_selected_week_start";

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

/** Friday noon of the Mon–Sat work week. */
export function getDeadlineAt(monday: Date): Date {
  const friday = addDays(monday, 4);
  return new Date(friday.getFullYear(), friday.getMonth(), friday.getDate(), 12, 0, 0, 0);
}

/** Friday noon of the Mon–Sat work week, e.g. "DL nhập thành phẩm: 12h 24/07/2026". */
export function formatDeadlineNote(monday: Date): string {
  const deadline = getDeadlineAt(monday);
  const dd = String(deadline.getDate()).padStart(2, "0");
  const mm = String(deadline.getMonth() + 1).padStart(2, "0");
  const yyyy = deadline.getFullYear();
  return `DL nhập thành phẩm: 12h ${dd}/${mm}/${yyyy}`;
}

export type DeadlineUrgency = "ok" | "soon" | "urgent" | "critical" | "overdue";

/** Urgency relative to Friday 12:00 deadline. */
export function getDeadlineUrgency(deadline: Date, now: Date = new Date()): DeadlineUrgency {
  const ms = deadline.getTime() - now.getTime();
  if (ms < 0) return "overdue";
  const hours = ms / (1000 * 60 * 60);
  if (hours <= 3) return "critical";
  if (hours <= 24) return "urgent";
  if (hours <= 48) return "soon";
  return "ok";
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

export function getStoredWeekStart(): string | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(SELECTED_WEEK_STORAGE_KEY);
  if (!raw) return null;
  return parseIsoDate(raw) ? getWeekInfo(parseIsoDate(raw) ?? new Date()).weekStart : null;
}

export function setStoredWeekStart(weekStart: string): void {
  if (typeof window === "undefined") return;
  const parsed = parseIsoDate(weekStart);
  if (!parsed) return;
  window.localStorage.setItem(
    SELECTED_WEEK_STORAGE_KEY,
    getWeekInfo(parsed).weekStart
  );
}

export function resolvePreferredWeek(raw?: unknown): WeekInfo {
  if (typeof raw === "string" && raw.trim()) {
    const parsed = parseIsoDate(raw);
    if (parsed) return getWeekInfo(parsed);
  }
  const stored = getStoredWeekStart();
  if (stored) return getWeekInfo(parseIsoDate(stored) ?? new Date());
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
