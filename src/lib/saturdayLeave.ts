/** Saturday leave registration — roster + status helpers. */

export type LeaveStatus = "off" | "full" | "morning" | "afternoon";

export type LeaveBrand = "general" | "im" | "ec";

export interface LeavePerson {
  name: string;
  brand: LeaveBrand;
  /** Team lead for IM (IELTSMentor) or EC (ClassUp) */
  isTeamLead: boolean;
  avatar?: string | null;
}

/** Infer brand from department / account-type text. */
export function inferLeaveBrand(raw: string | null | undefined): LeaveBrand {
  const hay = String(raw ?? "").toLowerCase();
  if (/ielts\s*mentor|\bielts\b|\bim\b/.test(hay)) return "im";
  if (/class\s*up|\bclassup\b|\bec\b|english\s*center/.test(hay)) return "ec";
  return "general";
}

/** True when account type / role text indicates team lead (trưởng nhóm). */
export function isTeamLeadLabel(raw: string | null | undefined): boolean {
  const hay = String(raw ?? "")
    .toLowerCase()
    .replace(/[_-]+/g, " ");
  return /trưởng\s*nhóm|truong\s*nhom|team\s*lead|teamlead|leader|\btn\b/.test(hay);
}

/** True when account type / role text indicates department head (trưởng phòng). */
export function isDepartmentHeadLabel(raw: string | null | undefined): boolean {
  const hay = String(raw ?? "")
    .toLowerCase()
    .replace(/[_-]+/g, " ");
  return /trưởng\s*phòng|truong\s*phong|dept\.?\s*head|department\s*head|head\s*of\s*dept/.test(
    hay
  );
}

export function isLeaveBrand(value: unknown): value is LeaveBrand {
  return value === "general" || value === "im" || value === "ec";
}

type AccountPosition = {
  accountType?: { name?: string | null; slug?: string | null } | null;
} | null | undefined;

/** Team lead if account type name/slug matches teamlead / trưởng nhóm. */
export function isTeamLeadAccount(position: AccountPosition): boolean {
  if (!position?.accountType) return false;
  return (
    isTeamLeadLabel(position.accountType.name) || isTeamLeadLabel(position.accountType.slug)
  );
}

/** Department head if account type name/slug matches trưởng phòng. */
export function isDepartmentHeadAccount(position: AccountPosition): boolean {
  if (!position?.accountType) return false;
  return (
    isDepartmentHeadLabel(position.accountType.name) ||
    isDepartmentHeadLabel(position.accountType.slug)
  );
}

/** Can pick another person's day plan — chỉ trưởng phòng. */
export function canSelectOtherPersonnel(position: AccountPosition): boolean {
  return isDepartmentHeadAccount(position);
}

export const LEAVE_BRAND_OPTIONS: { value: LeaveBrand; label: string }[] = [
  { value: "general", label: "Ban điều hành" },
  { value: "im", label: "IELTSMentor" },
  { value: "ec", label: "ClassUp" }
];

export interface SaturdayLeaveEntry {
  id: number;
  workDate: string;
  personName: string;
  status: LeaveStatus;
  updatedBy: string;
  updatedAt: string;
}

export interface LeaveStatusOption {
  value: LeaveStatus;
  label: string;
  short: string;
}

export const LEAVE_STATUS_OPTIONS: LeaveStatusOption[] = [
  { value: "full", label: "Cả ngày", short: "Cả ngày" },
  { value: "morning", label: "Sáng", short: "Sáng" },
  { value: "afternoon", label: "Chiều", short: "Chiều" },
  { value: "off", label: "OFF", short: "OFF" }
];

export const LEAVE_STATUS_SET = new Set<string>(LEAVE_STATUS_OPTIONS.map((o) => o.value));

/** Roster mirrors the ops spreadsheet (grouped by brand). */
export const SATURDAY_LEAVE_ROSTER: LeavePerson[] = [
  { name: "Ms. Hoàng Thị", brand: "general", isTeamLead: false },
  { name: "Mr. Đức Anh", brand: "general", isTeamLead: false },
  { name: "Ms. Hà Thu", brand: "general", isTeamLead: false },
  { name: "Ms. Kim Bắc", brand: "general", isTeamLead: false },
  { name: "Mr. Tiến Dũng", brand: "im", isTeamLead: true },
  { name: "Ms. Cẩm Tú", brand: "im", isTeamLead: true },
  { name: "Ms. Việt Anh", brand: "im", isTeamLead: true },
  { name: "Mr. Hồ Nguyên", brand: "im", isTeamLead: true },
  { name: "Mr. Khoa Trần", brand: "im", isTeamLead: true },
  { name: "Ms. Bùi Thoa", brand: "ec", isTeamLead: true },
  { name: "Ms. Thu An", brand: "ec", isTeamLead: true }
];

export const BRAND_META: Record<
  LeaveBrand,
  { label: string; short: string; metricTitle: string; metricHint: string }
> = {
  general: {
    label: "Ban điều hành",
    short: "BDH",
    metricTitle: "",
    metricHint: ""
  },
  im: {
    label: "IELTSMentor",
    short: "IM",
    metricTitle: "SL TN IM làm việc T7",
    metricHint: "Số lượng trưởng nhóm IELTSMentor làm việc Thứ 7"
  },
  ec: {
    label: "ClassUp",
    short: "EC",
    metricTitle: "SL TN EC làm việc T7",
    metricHint: "Số lượng trưởng nhóm ClassUp làm việc Thứ 7"
  }
};

const MAX_LEAVE_RATIO = 0.5;

export function isLeaveStatus(value: unknown): value is LeaveStatus {
  return typeof value === "string" && LEAVE_STATUS_SET.has(value);
}

export function isWorkingStatus(status: LeaveStatus | null | undefined): boolean {
  return status === "full" || status === "morning" || status === "afternoon";
}

export function leaveStatusLabel(status: LeaveStatus | null | undefined): string {
  if (!status) return "Chưa chọn";
  return LEAVE_STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status;
}

/** YYYY-MM */
export function toMonthKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function parseMonthKey(raw: unknown): { year: number; month: number; key: string } | null {
  const s = String(raw ?? "").trim();
  const m = /^(\d{4})-(\d{2})$/.exec(s);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (!Number.isInteger(year) || month < 1 || month > 12) return null;
  return { year, month, key: `${year}-${String(month).padStart(2, "0")}` };
}

export function resolveMonthKey(raw: unknown, fallback = new Date()): string {
  const parsed = parseMonthKey(raw);
  if (parsed) return parsed.key;
  return toMonthKey(fallback);
}

export function monthLabelVi(monthKey: string): string {
  const parsed = parseMonthKey(monthKey);
  if (!parsed) return monthKey;
  return `Tháng ${String(parsed.month).padStart(2, "0")}_${parsed.year}`;
}

/** All Saturdays that fall in the given calendar month (local). */
export function saturdaysInMonth(monthKey: string): string[] {
  const parsed = parseMonthKey(monthKey);
  if (!parsed) return [];
  const { year, month } = parsed;
  const dates: string[] = [];
  const d = new Date(year, month - 1, 1);
  while (d.getMonth() === month - 1) {
    if (d.getDay() === 6) {
      const y = d.getFullYear();
      const mo = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      dates.push(`${y}-${mo}-${day}`);
    }
    d.setDate(d.getDate() + 1);
  }
  return dates;
}

export function formatShortDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  return `${Number(m[3])}/${Number(m[2])}`;
}

export function shiftMonth(monthKey: string, delta: number): string {
  const parsed = parseMonthKey(monthKey);
  if (!parsed) return monthKey;
  const d = new Date(parsed.year, parsed.month - 1 + delta, 1);
  return toMonthKey(d);
}

export interface BrandDayStats {
  brand: LeaveBrand;
  total: number;
  off: number;
  working: number;
  unset: number;
  teamLeadsWorking: number;
  teamLeadsTotal: number;
}

export function calcBrandDayStats(
  brand: LeaveBrand,
  workDate: string,
  statusByPerson: Map<string, LeaveStatus | null>,
  roster: LeavePerson[] = SATURDAY_LEAVE_ROSTER
): BrandDayStats {
  const people = roster.filter((p) => p.brand === brand);
  let off = 0;
  let working = 0;
  let unset = 0;
  let teamLeadsWorking = 0;
  let teamLeadsTotal = 0;

  for (const person of people) {
    const status = statusByPerson.get(`${person.name}::${workDate}`) ?? null;
    if (person.isTeamLead) {
      teamLeadsTotal += 1;
      if (isWorkingStatus(status)) teamLeadsWorking += 1;
    }
    if (!status) {
      unset += 1;
    } else if (status === "off") {
      off += 1;
    } else if (isWorkingStatus(status)) {
      working += 1;
    }
  }

  return {
    brand,
    total: people.length,
    off,
    working,
    unset,
    teamLeadsWorking,
    teamLeadsTotal
  };
}

/** Per-person leave share across Saturdays in the month (OFF / total Saturdays). */
export interface PersonMonthStats {
  personName: string;
  saturdayCount: number;
  offCount: number;
  workingCount: number;
  unsetCount: number;
  leaveRatio: number;
  /** true when OFF share exceeds 50% of Saturdays in the month */
  overLimit: boolean;
  /** Max OFF days still within the 50% rule */
  maxOffAllowed: number;
}

export function calcPersonMonthStats(
  personName: string,
  saturdays: string[],
  statusByPerson: Map<string, LeaveStatus | null>
): PersonMonthStats {
  const saturdayCount = saturdays.length;
  let offCount = 0;
  let workingCount = 0;
  let unsetCount = 0;

  for (const day of saturdays) {
    const status = statusByPerson.get(`${personName}::${day}`) ?? null;
    if (!status) unsetCount += 1;
    else if (status === "off") offCount += 1;
    else if (isWorkingStatus(status)) workingCount += 1;
  }

  const leaveRatio = saturdayCount === 0 ? 0 : offCount / saturdayCount;
  const maxOffAllowed = saturdayCount === 0 ? 0 : Math.floor(saturdayCount * MAX_LEAVE_RATIO);

  return {
    personName,
    saturdayCount,
    offCount,
    workingCount,
    unsetCount,
    leaveRatio,
    overLimit: leaveRatio > MAX_LEAVE_RATIO,
    maxOffAllowed
  };
}

export { MAX_LEAVE_RATIO };
