import { query } from "./db";
import { parseGoalItems } from "../src/lib/goalItems";
import {
  addDays,
  formatDeadlineNote,
  formatWeekLabel,
  resolveWeekStart,
  toIsoDate
} from "../src/lib/week";

export type DayPlanSourceType = "custom" | "personal_goal" | "weekly_task";

export interface DayPlanItem {
  id: number;
  weekStart: string;
  personName: string;
  planDate: string;
  endDate: string;
  title: string;
  notes: string;
  startMinute: number | null;
  endMinute: number | null;
  sourceType: DayPlanSourceType;
  sourceKey: string | null;
  status: string;
  sortOrder: number;
  reminderEnabled: boolean;
  reminderMinutesBefore: number;
}

export interface PlanSourceItem {
  sourceType: Exclude<DayPlanSourceType, "custom">;
  sourceKey: string;
  title: string;
  status: string;
  detail?: string;
}

export interface PlanDayMeta {
  date: string;
  weekday: string;
  dayLabel: string;
}

export interface DayPlanBoard {
  meta: {
    weekStart: string;
    weekLabel: string;
    deadlineNote: string;
    personName: string;
    personAvatar: string | null;
    days: PlanDayMeta[];
  };
  personnel: { name: string; avatar?: string | null }[];
  sources: PlanSourceItem[];
  items: DayPlanItem[];
}

interface PlanRow {
  id: number;
  week_start: string;
  person_name: string;
  plan_date: string;
  end_date: string | null;
  title: string;
  notes: string;
  start_minute: number | null;
  end_minute: number | null;
  source_type: string;
  source_key: string | null;
  status: string;
  sort_order: number;
  reminder_enabled: boolean;
  reminder_minutes_before: number;
}

interface PersonnelRow {
  name: string;
  avatar_url: string | null;
}

const WEEKDAY_LABELS = ["T2", "T3", "T4", "T5", "T6", "T7"] as const;
const DAY_LABELS = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"] as const;

const PLAN_SELECT = `
  id,
  week_start::text AS week_start,
  person_name,
  plan_date::text AS plan_date,
  COALESCE(end_date, plan_date)::text AS end_date,
  title,
  notes,
  start_minute,
  end_minute,
  source_type,
  source_key,
  status,
  sort_order,
  COALESCE(reminder_enabled, FALSE) AS reminder_enabled,
  COALESCE(reminder_minutes_before, 15) AS reminder_minutes_before
`;

function asIsoDate(value: string): string {
  return value.slice(0, 10);
}

function clampReminderMinutes(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 15;
  return Math.max(0, Math.min(24 * 60, Math.round(n)));
}

function mapItem(row: PlanRow): DayPlanItem {
  const planDate = asIsoDate(row.plan_date);
  return {
    id: row.id,
    weekStart: asIsoDate(row.week_start),
    personName: row.person_name,
    planDate,
    endDate: asIsoDate(row.end_date || planDate),
    title: row.title ?? "",
    notes: row.notes ?? "",
    startMinute: row.start_minute,
    endMinute: row.end_minute,
    sourceType: (row.source_type as DayPlanSourceType) || "custom",
    sourceKey: row.source_key,
    status: row.status || "pending",
    sortOrder: row.sort_order ?? 0,
    reminderEnabled: Boolean(row.reminder_enabled),
    reminderMinutesBefore: clampReminderMinutes(row.reminder_minutes_before)
  };
}

function buildWeekDays(weekStart: string): PlanDayMeta[] {
  const week = resolveWeekStart(weekStart);
  return WEEKDAY_LABELS.map((weekday, i) => {
    const date = addDays(week.start, i);
    return {
      date: toIsoDate(date),
      weekday,
      dayLabel: `${DAY_LABELS[i]} ${date.getDate()}/${date.getMonth() + 1}`
    };
  });
}

function isDateInWeek(planDate: string, weekStart: string): boolean {
  return buildWeekDays(weekStart).some((d) => d.date === planDate);
}

function clampMinute(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(24 * 60, Math.round(n)));
}

function normalizeRange(start: string, end: string | null | undefined, weekStart: string) {
  const planDate = asIsoDate(start);
  let endDate = asIsoDate(end || start);
  if (!isDateInWeek(planDate, weekStart) || !isDateInWeek(endDate, weekStart)) {
    throw new Error("DATE_OUT_OF_WEEK");
  }
  if (endDate < planDate) endDate = planDate;
  return { planDate, endDate };
}

export async function getDayPlanBoard(
  weekRaw: unknown,
  personNameRaw: unknown
): Promise<DayPlanBoard> {
  const week = resolveWeekStart(weekRaw);
  const personName = String(personNameRaw ?? "").trim();
  if (!personName) throw new Error("PERSON_REQUIRED");

  const [personnelRes, personRes, goalsRes, tasksRes, plansRes] = await Promise.all([
    query<PersonnelRow>(`SELECT name, avatar_url FROM personnel ORDER BY id ASC`),
    query<PersonnelRow>(
      `SELECT name, avatar_url FROM personnel WHERE name = $1 LIMIT 1`,
      [personName]
    ),
    query<{ id: number; goals: string; status: string }>(
      `
      SELECT id, goals, status
      FROM personal_goals
      WHERE week_start = $1::date AND person_name = $2
      ORDER BY sort_order ASC, id ASC
      `,
      [week.weekStart, personName]
    ),
    query<{ id: number; item: string; objective: string; status: string; pics: unknown }>(
      `
      SELECT id, item, objective, status, pics
      FROM weekly_tasks
      WHERE week_start = $1::date
      ORDER BY category_id ASC, sort_order ASC, id ASC
      `,
      [week.weekStart]
    ),
    query<PlanRow>(
      `
      SELECT ${PLAN_SELECT}
      FROM personal_day_plans
      WHERE week_start = $1::date AND person_name = $2
      ORDER BY sort_order ASC, id ASC
      `,
      [week.weekStart, personName]
    )
  ]);

  const sources: PlanSourceItem[] = [];

  for (const row of goalsRes.rows) {
    const items = parseGoalItems(row.goals ?? "");
    items.forEach((goal, index) => {
      sources.push({
        sourceType: "personal_goal",
        sourceKey: `pg:${row.id}:${index}`,
        title: goal.text.split(/\r?\n/).find((l) => l.trim())?.trim() || goal.text,
        status: row.status || "pending",
        detail: "Mục tiêu cá nhân"
      });
    });
  }

  for (const row of tasksRes.rows) {
    const pics = Array.isArray(row.pics) ? row.pics : [];
    const isPic = pics.some(
      (p) => p && typeof p === "object" && String((p as { name?: string }).name ?? "") === personName
    );
    if (!isPic) continue;
    const title = (row.item || row.objective || "").trim() || `Task #${row.id}`;
    sources.push({
      sourceType: "weekly_task",
      sourceKey: `wt:${row.id}`,
      title,
      status: row.status || "pending",
      detail: "Mục tiêu tuần"
    });
  }

  const person = personRes.rows[0];

  return {
    meta: {
      weekStart: week.weekStart,
      weekLabel: week.weekLabel || formatWeekLabel(week.start),
      deadlineNote: formatDeadlineNote(week.start),
      personName,
      personAvatar: person?.avatar_url ?? null,
      days: buildWeekDays(week.weekStart)
    },
    personnel: personnelRes.rows.map((p) => ({
      name: p.name,
      avatar: p.avatar_url
    })),
    sources,
    items: plansRes.rows.map(mapItem)
  };
}

export async function createDayPlan(input: {
  weekStart: string;
  personName: string;
  planDate: string;
  endDate?: string | null;
  title?: string;
  notes?: string;
  startMinute?: number | null;
  endMinute?: number | null;
  sourceType?: DayPlanSourceType;
  sourceKey?: string | null;
  status?: string;
  sortOrder?: number;
  reminderEnabled?: boolean;
  reminderMinutesBefore?: number;
}): Promise<DayPlanItem> {
  const week = resolveWeekStart(input.weekStart);
  const personName = input.personName.trim();
  if (!personName) throw new Error("PERSON_REQUIRED");

  const { planDate, endDate } = normalizeRange(input.planDate, input.endDate, week.weekStart);

  const sortRes = await query<{ next_sort: number }>(
    `
    SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_sort
    FROM personal_day_plans
    WHERE week_start = $1::date AND person_name = $2
    `,
    [week.weekStart, personName]
  );

  const res = await query<PlanRow>(
    `
    INSERT INTO personal_day_plans (
      week_start, person_name, plan_date, end_date, title, notes,
      start_minute, end_minute, source_type, source_key, status, sort_order,
      reminder_enabled, reminder_minutes_before
    )
    VALUES ($1::date, $2, $3::date, $4::date, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    RETURNING ${PLAN_SELECT}
    `,
    [
      week.weekStart,
      personName,
      planDate,
      endDate,
      input.title ?? "",
      input.notes ?? "",
      clampMinute(input.startMinute),
      clampMinute(input.endMinute),
      input.sourceType ?? "custom",
      input.sourceKey ?? null,
      input.status ?? "pending",
      input.sortOrder ?? sortRes.rows[0]?.next_sort ?? 0,
      Boolean(input.reminderEnabled),
      clampReminderMinutes(input.reminderMinutesBefore ?? 15)
    ]
  );

  return mapItem(res.rows[0]);
}

export async function updateDayPlan(
  id: number,
  input: {
    planDate?: string;
    endDate?: string | null;
    title?: string;
    notes?: string;
    startMinute?: number | null;
    endMinute?: number | null;
    status?: string;
    sortOrder?: number;
    reminderEnabled?: boolean;
    reminderMinutesBefore?: number;
  }
): Promise<DayPlanItem | null> {
  const existing = await query<PlanRow>(
    `SELECT ${PLAN_SELECT} FROM personal_day_plans WHERE id = $1`,
    [id]
  );
  const current = existing.rows[0];
  if (!current) return null;

  const weekStart = asIsoDate(current.week_start);
  const range = normalizeRange(
    input.planDate ?? current.plan_date,
    input.endDate !== undefined ? input.endDate : current.end_date,
    weekStart
  );

  const res = await query<PlanRow>(
    `
    UPDATE personal_day_plans
    SET
      plan_date = $2::date,
      end_date = $3::date,
      title = $4,
      notes = $5,
      start_minute = $6,
      end_minute = $7,
      status = $8,
      sort_order = $9,
      reminder_enabled = $10,
      reminder_minutes_before = $11,
      updated_at = NOW()
    WHERE id = $1
    RETURNING ${PLAN_SELECT}
    `,
    [
      id,
      range.planDate,
      range.endDate,
      input.title ?? current.title,
      input.notes ?? current.notes,
      input.startMinute !== undefined ? clampMinute(input.startMinute) : current.start_minute,
      input.endMinute !== undefined ? clampMinute(input.endMinute) : current.end_minute,
      input.status ?? current.status,
      input.sortOrder ?? current.sort_order,
      input.reminderEnabled !== undefined
        ? Boolean(input.reminderEnabled)
        : Boolean(current.reminder_enabled),
      input.reminderMinutesBefore !== undefined
        ? clampReminderMinutes(input.reminderMinutesBefore)
        : clampReminderMinutes(current.reminder_minutes_before)
    ]
  );

  return mapItem(res.rows[0]);
}

export async function reorderDayPlans(
  personName: string,
  weekStart: string,
  orderedIds: number[]
): Promise<DayPlanItem[]> {
  const week = resolveWeekStart(weekStart);
  const clientIds = orderedIds.filter((id) => Number.isInteger(id) && id > 0);

  for (let i = 0; i < clientIds.length; i++) {
    await query(
      `
      UPDATE personal_day_plans
      SET sort_order = $1, updated_at = NOW()
      WHERE id = $2 AND person_name = $3 AND week_start = $4::date
      `,
      [i, clientIds[i], personName.trim(), week.weekStart]
    );
  }

  const res = await query<PlanRow>(
    `
    SELECT ${PLAN_SELECT}
    FROM personal_day_plans
    WHERE week_start = $1::date AND person_name = $2
    ORDER BY sort_order ASC, id ASC
    `,
    [week.weekStart, personName.trim()]
  );

  return res.rows.map(mapItem);
}

export async function deleteDayPlan(id: number): Promise<boolean> {
  const res = await query(`DELETE FROM personal_day_plans WHERE id = $1`, [id]);
  return (res.rowCount ?? 0) > 0;
}
