/** Meeting schedule types + seed data from legacy spreadsheet. */

export type MeetingKind =
  | "ban_dieu_hanh"
  | "muc_tieu_tuan"
  | "cntt"
  | "hdqt"
  | "coaching"
  | "phong_van"
  | "ap"
  | "other";

export type Weekday = 2 | 3 | 4 | 5 | 6;

export interface Meeting {
  id: number;
  ownerKey: string;
  /** Monday of the week, YYYY-MM-DD */
  weekStart: string;
  /** 2=Mon … 6=Fri */
  weekday: Weekday;
  /** Minutes from midnight */
  startMin: number;
  endMin: number;
  title: string;
  attendees: string;
  location: string;
  note: string;
  kind: MeetingKind;
  /** Soft block like "Full sáng" */
  isBlock: boolean;
}

export interface WeekNote {
  id: number;
  ownerKey: string;
  weekStart: string;
  text: string;
}

export interface MeetingOwner {
  id: string;
  name: string;
  title: string;
}

export type MeetingInput = Omit<Meeting, "id">;

export const DEFAULT_MEETING_OWNER = "van-anh";

export const MEETING_OWNERS: MeetingOwner[] = [
  { id: "van-anh", name: "Ms. Vân Anh", title: "Lịch họp cá nhân" }
];

export const MEETING_KIND_OPTIONS: { value: MeetingKind; label: string }[] = [
  { value: "ban_dieu_hanh", label: "Ban điều hành" },
  { value: "muc_tieu_tuan", label: "Mục tiêu tuần" },
  { value: "cntt", label: "CNTT" },
  { value: "hdqt", label: "HĐQT" },
  { value: "coaching", label: "Coaching" },
  { value: "phong_van", label: "Phỏng vấn" },
  { value: "ap", label: "AP" },
  { value: "other", label: "Khác" }
];

export const MEETING_KIND_META: Record<
  MeetingKind,
  { label: string; color: string; bg: string; border: string }
> = {
  ban_dieu_hanh: {
    label: "Ban điều hành",
    color: "#3b1d8f",
    bg: "#ede9fe",
    border: "#8b5cf6"
  },
  muc_tieu_tuan: {
    label: "Mục tiêu tuần",
    color: "#1e3a5f",
    bg: "#e0f2fe",
    border: "#38bdf8"
  },
  cntt: {
    label: "CNTT",
    color: "#14532d",
    bg: "#dcfce7",
    border: "#22c55e"
  },
  hdqt: {
    label: "HĐQT",
    color: "#7c2d12",
    bg: "#ffedd5",
    border: "#f97316"
  },
  coaching: {
    label: "Coaching",
    color: "#831843",
    bg: "#fce7f3",
    border: "#ec4899"
  },
  phong_van: {
    label: "Phỏng vấn",
    color: "#164e63",
    bg: "#cffafe",
    border: "#06b6d4"
  },
  ap: {
    label: "AP",
    color: "#713f12",
    bg: "#fef9c3",
    border: "#eab308"
  },
  other: {
    label: "Khác",
    color: "#374151",
    bg: "#f3f4f6",
    border: "#9ca3af"
  }
};

export function isMeetingKind(value: unknown): value is MeetingKind {
  return typeof value === "string" && value in MEETING_KIND_META;
}

export function formatTimeRange(startMin: number, endMin: number): string {
  const fmt = (m: number) => {
    const h = Math.floor(m / 60);
    const min = m % 60;
    return min === 0 ? `${h}h` : `${h}h${String(min).padStart(2, "0")}`;
  };
  return `${fmt(startMin)}–${fmt(endMin)}`;
}

export function weekdayLabel(weekday: number): string {
  const map: Record<number, string> = {
    2: "Thứ 2",
    3: "Thứ 3",
    4: "Thứ 4",
    5: "Thứ 5",
    6: "Thứ 6"
  };
  return map[weekday] ?? `Thứ ${weekday}`;
}

export function minutesToTimeInput(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function timeInputToMinutes(value: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

const MORNING = { startMin: 8 * 60, endMin: 12 * 60 };
const AFTERNOON = { startMin: 13 * 60, endMin: 17 * 60 };

/** Week 4 Jul 2026 = Mon 20/7; Week 5 = Mon 27/7 */
export const WEEK4_START = "2026-07-20";
export const WEEK5_START = "2026-07-27";

type SeedMeeting = Omit<Meeting, "id" | "ownerKey">;
type SeedNote = Omit<WeekNote, "id" | "ownerKey">;

function sm(partial: SeedMeeting): SeedMeeting {
  return partial;
}

export const SEED_MEETINGS: SeedMeeting[] = [
  sm({
    weekStart: WEEK4_START,
    weekday: 2,
    ...MORNING,
    title: "Họp Ban điều hành",
    attendees: "",
    location: "",
    note: "",
    kind: "ban_dieu_hanh",
    isBlock: true
  }),
  sm({
    weekStart: WEEK4_START,
    weekday: 2,
    ...AFTERNOON,
    title: "Họp mục tiêu tuần",
    attendees: "",
    location: "",
    note: "",
    kind: "muc_tieu_tuan",
    isBlock: true
  }),
  sm({
    weekStart: WEEK4_START,
    weekday: 3,
    ...MORNING,
    title: "Họp mục tiêu tuần",
    attendees: "",
    location: "",
    note: "",
    kind: "muc_tieu_tuan",
    isBlock: true
  }),
  sm({
    weekStart: WEEK4_START,
    weekday: 3,
    ...AFTERNOON,
    title: "Họp mục tiêu tuần",
    attendees: "",
    location: "",
    note: "",
    kind: "muc_tieu_tuan",
    isBlock: true
  }),
  sm({
    weekStart: WEEK4_START,
    weekday: 4,
    startMin: 9 * 60 + 15,
    endMin: 10 * 60,
    title: "Họp CNTT",
    attendees: "Mr Tiến Dũng",
    location: "Phòng họp Hải Đăng",
    note: "",
    kind: "cntt",
    isBlock: false
  }),
  sm({
    weekStart: WEEK4_START,
    weekday: 4,
    startMin: 15 * 60,
    endMin: 16 * 60,
    title: "Họp HĐQT",
    attendees: "",
    location: "Online - P.TCGV",
    note: "",
    kind: "hdqt",
    isBlock: false
  }),
  sm({
    weekStart: WEEK4_START,
    weekday: 4,
    startMin: 16 * 60,
    endMin: 17 * 60,
    title: "Họp HĐQT",
    attendees: "",
    location: "Online - P.TCGV",
    note: "",
    kind: "hdqt",
    isBlock: false
  }),
  sm({
    weekStart: WEEK4_START,
    weekday: 4,
    startMin: 17 * 60,
    endMin: 18 * 60,
    title: "Coaching sát hạch",
    attendees: "Ms Bùi Thoa",
    location: "Online - P.TCGV",
    note: "",
    kind: "coaching",
    isBlock: false
  }),
  sm({
    weekStart: WEEK4_START,
    weekday: 5,
    startMin: 15 * 60 + 30,
    endMin: 17 * 60,
    title: "Họp CNTT",
    attendees: "Mr Tiến Dũng",
    location: "Phòng họp Hải Đăng",
    note: "",
    kind: "cntt",
    isBlock: false
  }),
  sm({
    weekStart: WEEK4_START,
    weekday: 6,
    ...MORNING,
    title: "Họp mục tiêu tuần",
    attendees: "",
    location: "",
    note: "",
    kind: "muc_tieu_tuan",
    isBlock: true
  }),
  sm({
    weekStart: WEEK4_START,
    weekday: 6,
    startMin: 14 * 60,
    endMin: 15 * 60 + 30,
    title: "Họp mục tiêu tuần",
    attendees: "",
    location: "",
    note: "",
    kind: "muc_tieu_tuan",
    isBlock: false
  }),
  sm({
    weekStart: WEEK5_START,
    weekday: 2,
    ...MORNING,
    title: "Họp Ban điều hành",
    attendees: "",
    location: "",
    note: "",
    kind: "ban_dieu_hanh",
    isBlock: true
  }),
  sm({
    weekStart: WEEK5_START,
    weekday: 2,
    ...AFTERNOON,
    title: "Họp mục tiêu tuần",
    attendees: "",
    location: "",
    note: "",
    kind: "muc_tieu_tuan",
    isBlock: true
  }),
  sm({
    weekStart: WEEK5_START,
    weekday: 3,
    ...MORNING,
    title: "Họp mục tiêu tuần",
    attendees: "",
    location: "",
    note: "",
    kind: "muc_tieu_tuan",
    isBlock: true
  }),
  sm({
    weekStart: WEEK5_START,
    weekday: 3,
    startMin: 14 * 60 + 30,
    endMin: 15 * 60,
    title: "Họp AP tháng 8",
    attendees: "Mr Tiến Dũng",
    location: "Phòng họp Hải Đăng",
    note: "",
    kind: "ap",
    isBlock: false
  }),
  sm({
    weekStart: WEEK5_START,
    weekday: 3,
    ...AFTERNOON,
    title: "Họp mục tiêu tuần",
    attendees: "",
    location: "",
    note: "",
    kind: "muc_tieu_tuan",
    isBlock: true
  }),
  sm({
    weekStart: WEEK5_START,
    weekday: 4,
    startMin: 9 * 60 + 15,
    endMin: 10 * 60,
    title: "Họp CNTT",
    attendees: "Mr Tiến Dũng + Ms Hà Thư + Mr Hồ Nguyên",
    location: "Phòng họp Hải Đăng",
    note: "",
    kind: "cntt",
    isBlock: false
  }),
  sm({
    weekStart: WEEK5_START,
    weekday: 4,
    startMin: 14 * 60,
    endMin: 15 * 60 + 30,
    title: "Phỏng vấn",
    attendees: "Mr Đức Anh + Khoa Trần",
    location: "Online - P.TCGV",
    note: "",
    kind: "phong_van",
    isBlock: false
  }),
  sm({
    weekStart: WEEK5_START,
    weekday: 5,
    startMin: 15 * 60 + 30,
    endMin: 18 * 60,
    title: "Họp CNTT",
    attendees: "Mr Tiến Dũng",
    location: "Phòng họp Hải Đăng",
    note: "",
    kind: "cntt",
    isBlock: false
  }),
  sm({
    weekStart: WEEK5_START,
    weekday: 6,
    ...MORNING,
    title: "Họp mục tiêu tuần",
    attendees: "",
    location: "",
    note: "",
    kind: "muc_tieu_tuan",
    isBlock: true
  }),
  sm({
    weekStart: WEEK5_START,
    weekday: 6,
    ...AFTERNOON,
    title: "Họp mục tiêu tuần",
    attendees: "",
    location: "",
    note: "",
    kind: "muc_tieu_tuan",
    isBlock: true
  })
];

export const SEED_WEEK_NOTES: SeedNote[] = [
  {
    weekStart: WEEK5_START,
    text: "Ms Bắc — đi du lịch → Tuần 1 tháng 8"
  },
  {
    weekStart: WEEK5_START,
    text: "Ms Thu An chỉ còn lịch chiều thứ 4"
  }
];

/** Pack overlapping meetings into columns (Google Calendar style). */
export function layoutDayMeetings(
  meetings: Meeting[]
): Array<Meeting & { col: number; colCount: number }> {
  const sorted = [...meetings].sort(
    (a, b) => a.startMin - b.startMin || b.endMin - a.endMin
  );
  type Placed = Meeting & { col: number; colCount: number };
  const result: Placed[] = [];
  let cluster: Placed[] = [];
  let clusterMaxCol = 0;

  const flush = () => {
    for (const p of cluster) p.colCount = clusterMaxCol + 1;
    cluster = [];
    clusterMaxCol = 0;
  };

  for (const mtg of sorted) {
    const overlaps = cluster.some((p) => p.endMin > mtg.startMin);
    if (!overlaps && cluster.length) flush();

    const used = new Set(cluster.filter((p) => p.endMin > mtg.startMin).map((p) => p.col));
    let col = 0;
    while (used.has(col)) col++;
    const item: Placed = { ...mtg, col, colCount: 1 };
    cluster.push(item);
    clusterMaxCol = Math.max(clusterMaxCol, col);
    result.push(item);
  }
  flush();
  return result;
}
