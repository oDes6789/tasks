import { query } from "./db";
import {
  addDays,
  formatWeekLabel,
  getWeekInfo,
  parseIsoDate,
  toIsoDate
} from "../src/lib/week";
import {
  BRAND_META,
  calcPersonMonthStats,
  toMonthKey,
  type LeaveBrand,
  type LeaveStatus
} from "../src/lib/saturdayLeave";
import { listSaturdayLeave } from "./saturdayLeaveRepo";

export interface DashboardPicStat {
  name: string;
  count: number;
}

export interface DashboardActivity {
  id: string;
  kind: "task" | "goal";
  title: string;
  actor: string;
  updatedAt: string;
}

export interface DashboardCategoryStat {
  id: number;
  title: string;
  total: number;
  done: number;
}

export interface DashboardLeaveBrandStat {
  brand: LeaveBrand;
  label: string;
  tracked: number;
}

export interface DashboardSummary {
  greetingName: string;
  period: DashboardPeriod;
  weekStart: string;
  weekLabel: string;
  stats: {
    totalTasks: number;
    completed: number;
    inProgress: number;
    pending: number;
    donePct: number;
    kpiAchieved: number;
    kpiNotAchieved: number;
    kpiDelayed: number;
    kpiRated: number;
    kpiAchievedPct: number | null;
    backlogOpen: number;
    delayedCount: number;
    attentionCount: number;
    totalTasksDelta: number | null;
    donePctDelta: number | null;
  };
  goals: {
    total: number;
    done: number;
    inProgress: number;
    pending: number;
    onTrack: number;
  };
  dayPlan: {
    peopleWithGoals: number;
    peopleWithPlans: number;
    coveragePct: number | null;
  };
  leave: {
    month: string;
    trackedCount: number;
    nearCap: number;
    overLimit: number;
    byBrand: DashboardLeaveBrandStat[];
  };
  topDelayedPics: DashboardPicStat[];
  categories: DashboardCategoryStat[];
  activities: DashboardActivity[];
}

export type DashboardPeriod = "week" | "month" | "quarter" | "year";

interface CountRow {
  key: string;
  cnt: string | number;
}

interface PicCountRow {
  name: string;
  cnt: string | number;
}

interface ActivityRow {
  kind: string;
  id: number;
  title: string;
  actor: string;
  updated_at: string;
}

interface CategoryRow {
  id: number;
  title: string;
  total: string | number;
  done: string | number;
}

function asInt(value: string | number | null | undefined): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function pct(part: number, whole: number): number {
  if (whole <= 0) return 0;
  return Math.round((part / whole) * 100);
}

function countMap(rows: CountRow[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const row of rows) {
    map.set(row.key, asInt(row.cnt));
  }
  return map;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function startOfQuarter(date: Date): Date {
  const month = date.getMonth();
  const quarterStartMonth = Math.floor(month / 3) * 3;
  return new Date(date.getFullYear(), quarterStartMonth, 1);
}

function startOfYear(date: Date): Date {
  return new Date(date.getFullYear(), 0, 1);
}

interface PeriodRange {
  period: DashboardPeriod;
  label: string;
  start: Date;
  endExclusive: Date;
  compareStart: Date;
  compareEndExclusive: Date;
  weekStart: string;
}

function listMonthKeysBetween(start: Date, endExclusive: Date): string[] {
  const keys: string[] = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  while (cursor < endExclusive) {
    keys.push(toMonthKey(cursor));
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return keys;
}

function formatMonthLabel(date: Date): string {
  return `Tháng ${date.getMonth() + 1}/${date.getFullYear()}`;
}

function formatQuarterLabel(date: Date): string {
  return `Quý ${Math.floor(date.getMonth() / 3) + 1}/${date.getFullYear()}`;
}

function formatYearLabel(date: Date): string {
  return `Năm ${date.getFullYear()}`;
}

function resolvePeriodRange(
  weekRaw: unknown,
  periodRaw: unknown,
  refRaw: unknown
): PeriodRange {
  const requestedPeriod: DashboardPeriod =
    periodRaw === "month" || periodRaw === "quarter" || periodRaw === "year" ? periodRaw : "week";

  const refIso =
    typeof refRaw === "string" && refRaw.trim() ? String(refRaw).trim() : typeof weekRaw === "string" ? String(weekRaw).trim() : "";
  const referenceDate = parseIsoDate(refIso) ?? new Date();

  const week = getWeekInfo(referenceDate);
  const weekStart = week.weekStart;

  if (requestedPeriod === "week") {
    const start = week.start;
    return {
      period: "week",
      label: week.weekLabel || formatWeekLabel(start),
      start,
      endExclusive: addDays(start, 7),
      compareStart: addDays(start, -7),
      compareEndExclusive: start,
      weekStart
    };
  }

  const anchor = referenceDate;
  if (requestedPeriod === "month") {
    const start = startOfMonth(anchor);
    return {
      period: "month",
      label: formatMonthLabel(start),
      start,
      endExclusive: new Date(start.getFullYear(), start.getMonth() + 1, 1),
      compareStart: new Date(start.getFullYear(), start.getMonth() - 1, 1),
      compareEndExclusive: start,
      weekStart
    };
  }

  if (requestedPeriod === "quarter") {
    const start = startOfQuarter(anchor);
    return {
      period: "quarter",
      label: formatQuarterLabel(start),
      start,
      endExclusive: new Date(start.getFullYear(), start.getMonth() + 3, 1),
      compareStart: new Date(start.getFullYear(), start.getMonth() - 3, 1),
      compareEndExclusive: start,
      weekStart
    };
  }

  const start = startOfYear(anchor);
  return {
    period: "year",
    label: formatYearLabel(start),
    start,
    endExclusive: new Date(start.getFullYear() + 1, 0, 1),
    compareStart: new Date(start.getFullYear() - 1, 0, 1),
    compareEndExclusive: start,
    weekStart
  };
}

async function taskStatusCounts(weekStart: string): Promise<Map<string, number>> {
  const res = await query<CountRow>(
    `
    SELECT status AS key, COUNT(*)::int AS cnt
    FROM weekly_tasks
    WHERE week_start = $1::date
    GROUP BY status
    `,
    [weekStart]
  );
  return countMap(res.rows);
}

async function taskStatusCountsInRange(start: string, endExclusive: string): Promise<Map<string, number>> {
  const res = await query<CountRow>(
    `
    SELECT status AS key, COUNT(*)::int AS cnt
    FROM weekly_tasks
    WHERE week_start >= $1::date
      AND week_start < $2::date
    GROUP BY status
    `,
    [start, endExclusive]
  );
  return countMap(res.rows);
}

async function taskKpiCounts(weekStart: string): Promise<Map<string, number>> {
  const res = await query<CountRow>(
    `
    SELECT kpi AS key, COUNT(*)::int AS cnt
    FROM weekly_tasks
    WHERE week_start = $1::date
      AND kpi IN ('achieved', 'not_achieved', 'delayed')
    GROUP BY kpi
    `,
    [weekStart]
  );
  return countMap(res.rows);
}

async function taskKpiCountsInRange(start: string, endExclusive: string): Promise<Map<string, number>> {
  const res = await query<CountRow>(
    `
    SELECT kpi AS key, COUNT(*)::int AS cnt
    FROM weekly_tasks
    WHERE week_start >= $1::date
      AND week_start < $2::date
      AND kpi IN ('achieved', 'not_achieved', 'delayed')
    GROUP BY kpi
    `,
    [start, endExclusive]
  );
  return countMap(res.rows);
}

async function backlogOpenCount(weekStart: string): Promise<number> {
  const res = await query<{ cnt: string | number }>(
    `
    SELECT COUNT(*)::int AS cnt
    FROM weekly_tasks
    WHERE week_start = $1::date
      AND category_id = 6
      AND status <> 'done'
    `,
    [weekStart]
  );
  return asInt(res.rows[0]?.cnt);
}

async function backlogOpenCountInRange(start: string, endExclusive: string): Promise<number> {
  const res = await query<{ cnt: string | number }>(
    `
    SELECT COUNT(*)::int AS cnt
    FROM weekly_tasks
    WHERE week_start >= $1::date
      AND week_start < $2::date
      AND category_id = 6
      AND status <> 'done'
    `,
    [start, endExclusive]
  );
  return asInt(res.rows[0]?.cnt);
}

async function goalStatusCounts(weekStart: string): Promise<Map<string, number>> {
  const res = await query<CountRow>(
    `
    SELECT status AS key, COUNT(*)::int AS cnt
    FROM personal_goals
    WHERE week_start = $1::date
    GROUP BY status
    `,
    [weekStart]
  );
  return countMap(res.rows);
}

async function goalStatusCountsInRange(start: string, endExclusive: string): Promise<Map<string, number>> {
  const res = await query<CountRow>(
    `
    SELECT status AS key, COUNT(*)::int AS cnt
    FROM personal_goals
    WHERE week_start >= $1::date
      AND week_start < $2::date
    GROUP BY status
    `,
    [start, endExclusive]
  );
  return countMap(res.rows);
}

async function dayPlanCoverage(weekStart: string): Promise<{
  peopleWithGoals: number;
  peopleWithPlans: number;
  coveragePct: number | null;
}> {
  const [goalsRes, plansRes] = await Promise.all([
    query<{ cnt: string | number }>(
      `
      SELECT COUNT(DISTINCT TRIM(person_name))::int AS cnt
      FROM personal_goals
      WHERE week_start = $1::date
        AND TRIM(person_name) <> ''
      `,
      [weekStart]
    ),
    query<{ cnt: string | number }>(
      `
      SELECT COUNT(DISTINCT TRIM(person_name))::int AS cnt
      FROM personal_day_plans
      WHERE week_start = $1::date
        AND TRIM(person_name) <> ''
      `,
      [weekStart]
    )
  ]);

  const peopleWithGoals = asInt(goalsRes.rows[0]?.cnt);
  const peopleWithPlans = asInt(plansRes.rows[0]?.cnt);
  return {
    peopleWithGoals,
    peopleWithPlans,
    coveragePct: peopleWithGoals > 0 ? pct(peopleWithPlans, peopleWithGoals) : null
  };
}

async function dayPlanCoverageInRange(start: string, endExclusive: string): Promise<{
  peopleWithGoals: number;
  peopleWithPlans: number;
  coveragePct: number | null;
}> {
  const [goalsRes, plansRes] = await Promise.all([
    query<{ cnt: string | number }>(
      `
      SELECT COUNT(DISTINCT TRIM(person_name))::int AS cnt
      FROM personal_goals
      WHERE week_start >= $1::date
        AND week_start < $2::date
        AND TRIM(person_name) <> ''
      `,
      [start, endExclusive]
    ),
    query<{ cnt: string | number }>(
      `
      SELECT COUNT(DISTINCT TRIM(person_name))::int AS cnt
      FROM personal_day_plans
      WHERE week_start >= $1::date
        AND week_start < $2::date
        AND TRIM(person_name) <> ''
      `,
      [start, endExclusive]
    )
  ]);

  const peopleWithGoals = asInt(goalsRes.rows[0]?.cnt);
  const peopleWithPlans = asInt(plansRes.rows[0]?.cnt);
  return {
    peopleWithGoals,
    peopleWithPlans,
    coveragePct: peopleWithGoals > 0 ? pct(peopleWithPlans, peopleWithGoals) : null
  };
}

async function topDelayedPics(weekStart: string): Promise<DashboardPicStat[]> {
  const res = await query<PicCountRow>(
    `
    SELECT TRIM(elem->>'name') AS name, COUNT(*)::int AS cnt
    FROM weekly_tasks t,
    LATERAL jsonb_array_elements(COALESCE(t.pics, '[]'::jsonb)) AS elem
    WHERE t.week_start = $1::date
      AND (
        t.kpi IN ('delayed', 'not_achieved')
        OR (t.category_id = 6 AND t.status <> 'done')
      )
      AND NULLIF(TRIM(elem->>'name'), '') IS NOT NULL
    GROUP BY 1
    ORDER BY cnt DESC, name ASC
    LIMIT 8
    `,
    [weekStart]
  );
  return res.rows.map((row) => ({ name: row.name, count: asInt(row.cnt) }));
}

async function topDelayedPicsInRange(start: string, endExclusive: string): Promise<DashboardPicStat[]> {
  const res = await query<PicCountRow>(
    `
    SELECT TRIM(elem->>'name') AS name, COUNT(*)::int AS cnt
    FROM weekly_tasks t,
    LATERAL jsonb_array_elements(COALESCE(t.pics, '[]'::jsonb)) AS elem
    WHERE t.week_start >= $1::date
      AND t.week_start < $2::date
      AND (
        t.kpi IN ('delayed', 'not_achieved')
        OR (t.category_id = 6 AND t.status <> 'done')
      )
      AND NULLIF(TRIM(elem->>'name'), '') IS NOT NULL
    GROUP BY 1
    ORDER BY cnt DESC, name ASC
    LIMIT 8
    `,
    [start, endExclusive]
  );
  return res.rows.map((row) => ({ name: row.name, count: asInt(row.cnt) }));
}

async function categoryBreakdown(weekStart: string): Promise<DashboardCategoryStat[]> {
  const res = await query<CategoryRow>(
    `
    SELECT
      c.id,
      c.title,
      COUNT(t.id)::int AS total,
      COUNT(*) FILTER (WHERE t.status = 'done')::int AS done
    FROM task_categories c
    LEFT JOIN weekly_tasks t
      ON t.category_id = c.id AND t.week_start = $1::date
    GROUP BY c.id, c.title, c.sort_order
    ORDER BY c.sort_order ASC
    `,
    [weekStart]
  );
  return res.rows.map((row) => ({
    id: row.id,
    title: row.title,
    total: asInt(row.total),
    done: asInt(row.done)
  }));
}

async function categoryBreakdownInRange(
  start: string,
  endExclusive: string
): Promise<DashboardCategoryStat[]> {
  const res = await query<CategoryRow>(
    `
    SELECT
      c.id,
      c.title,
      COUNT(t.id)::int AS total,
      COUNT(*) FILTER (WHERE t.status = 'done')::int AS done
    FROM task_categories c
    LEFT JOIN weekly_tasks t
      ON t.category_id = c.id
      AND t.week_start >= $1::date
      AND t.week_start < $2::date
    GROUP BY c.id, c.title, c.sort_order
    ORDER BY c.sort_order ASC
    `,
    [start, endExclusive]
  );
  return res.rows.map((row) => ({
    id: row.id,
    title: row.title,
    total: asInt(row.total),
    done: asInt(row.done)
  }));
}

async function recentActivities(weekStart: string): Promise<DashboardActivity[]> {
  const res = await query<ActivityRow>(
    `
    SELECT kind, id, title, actor, updated_at
    FROM (
      SELECT
        'task'::text AS kind,
        id,
        COALESCE(
          NULLIF(TRIM(item), ''),
          NULLIF(TRIM(objective), ''),
          'Task #' || id::text
        ) AS title,
        COALESCE(NULLIF(TRIM(created_by), ''), '') AS actor,
        updated_at
      FROM weekly_tasks
      WHERE week_start = $1::date

      UNION ALL

      SELECT
        'goal'::text AS kind,
        id,
        COALESCE(NULLIF(TRIM(person_name), ''), 'Nhân sự') || ' · mục tiêu cá nhân' AS title,
        COALESCE(
          NULLIF(TRIM(created_by), ''),
          NULLIF(TRIM(person_name), ''),
          ''
        ) AS actor,
        updated_at
      FROM personal_goals
      WHERE week_start = $1::date
    ) u
    ORDER BY updated_at DESC
    LIMIT 10
    `,
    [weekStart]
  );

  return res.rows.map((row) => ({
    id: `${row.kind}-${row.id}`,
    kind: row.kind === "goal" ? "goal" : "task",
    title: row.title,
    actor: row.actor,
    updatedAt: row.updated_at
  }));
}

async function recentActivitiesInRange(
  start: string,
  endExclusive: string
): Promise<DashboardActivity[]> {
  const res = await query<ActivityRow>(
    `
    SELECT kind, id, title, actor, updated_at
    FROM (
      SELECT
        'task'::text AS kind,
        id,
        COALESCE(
          NULLIF(TRIM(item), ''),
          NULLIF(TRIM(objective), ''),
          'Task #' || id::text
        ) AS title,
        COALESCE(NULLIF(TRIM(created_by), ''), '') AS actor,
        updated_at
      FROM weekly_tasks
      WHERE week_start >= $1::date
        AND week_start < $2::date

      UNION ALL

      SELECT
        'goal'::text AS kind,
        id,
        COALESCE(NULLIF(TRIM(person_name), ''), 'Nhân sự') || ' · mục tiêu cá nhân' AS title,
        COALESCE(
          NULLIF(TRIM(created_by), ''),
          NULLIF(TRIM(person_name), ''),
          ''
        ) AS actor,
        updated_at
      FROM personal_goals
      WHERE week_start >= $1::date
        AND week_start < $2::date
    ) u
    ORDER BY updated_at DESC
    LIMIT 10
    `,
    [start, endExclusive]
  );

  return res.rows.map((row) => ({
    id: `${row.kind}-${row.id}`,
    kind: row.kind === "goal" ? "goal" : "task",
    title: row.title,
    actor: row.actor,
    updatedAt: row.updated_at
  }));
}

async function leaveSnapshot(range: PeriodRange): Promise<DashboardSummary["leave"]> {
  const monthKeys =
    range.period === "week"
      ? [toMonthKey(range.start)]
      : listMonthKeysBetween(range.start, range.endExclusive);

  const months = await Promise.all(monthKeys.map((monthKey) => listSaturdayLeave(monthKey)));
  const roster = months[0]?.roster ?? [];

  const statusByPerson = new Map<string, LeaveStatus | null>();
  for (const month of months) {
    for (const entry of month.entries) {
      // For week/month: we want the same semantics as calendar month stats.
      // For quarter/year: we still restrict to the selected time window.
      if (
        range.period === "week" ||
        (entry.workDate >= toIsoDate(range.start) && entry.workDate < toIsoDate(range.endExclusive))
      ) {
        statusByPerson.set(`${entry.personName}::${entry.workDate}`, entry.status);
      }
    }
  }

  const saturdays =
    range.period === "week"
      ? months[0]?.saturdays ?? []
      : months.flatMap((month) =>
          month.saturdays.filter(
            (day) => day >= toIsoDate(range.start) && day < toIsoDate(range.endExclusive)
          )
        );

  let nearCap = 0;
  let overLimit = 0;
  for (const person of roster) {
    const stats = calcPersonMonthStats(person.name, saturdays, statusByPerson);
    if (stats.overLimit) overLimit += 1;
    else if (stats.saturdayCount > 0 && stats.leaveRatio >= 0.4) nearCap += 1;
  }

  const brandOrder: LeaveBrand[] = ["general", "im", "ec"];
  const byBrand = brandOrder.map((brand) => ({
    brand,
    label: BRAND_META[brand].label,
    tracked: roster.filter((p) => p.brand === brand).length
  }));

  return {
    month:
      range.period === "week"
        ? formatMonthLabel(range.start)
        : range.period === "month"
          ? formatMonthLabel(range.start)
          : range.label,
    trackedCount: roster.length,
    nearCap,
    overLimit,
    byBrand
  };
}

function buildStats(
  status: Map<string, number>,
  kpi: Map<string, number>,
  backlogOpen: number,
  prev?: { total: number; donePct: number } | null
): DashboardSummary["stats"] {
  const completed = status.get("done") ?? 0;
  const inProgress = status.get("in_progress") ?? 0;
  const pending = status.get("pending") ?? 0;
  const totalTasks = [...status.values()].reduce((a, b) => a + b, 0);
  const donePct = pct(completed, totalTasks);

  const kpiAchieved = kpi.get("achieved") ?? 0;
  const kpiNotAchieved = kpi.get("not_achieved") ?? 0;
  const kpiDelayed = kpi.get("delayed") ?? 0;
  const kpiRated = kpiAchieved + kpiNotAchieved + kpiDelayed;

  return {
    totalTasks,
    completed,
    inProgress,
    pending,
    donePct,
    kpiAchieved,
    kpiNotAchieved,
    kpiDelayed,
    kpiRated,
    kpiAchievedPct: kpiRated > 0 ? pct(kpiAchieved, kpiRated) : null,
    backlogOpen,
    delayedCount: kpiDelayed,
    attentionCount: kpiDelayed + backlogOpen,
    totalTasksDelta: prev ? totalTasks - prev.total : null,
    donePctDelta: prev ? donePct - prev.donePct : null
  };
}

export async function getDashboardSummary(
  weekRaw: unknown,
  periodRaw: unknown,
  refRaw: unknown,
  greetingName: string
): Promise<DashboardSummary> {
  const range = resolvePeriodRange(weekRaw, periodRaw, refRaw);
  const start = toIsoDate(range.start);
  const endExclusive = toIsoDate(range.endExclusive);
  const compareStart = toIsoDate(range.compareStart);
  const compareEndExclusive = toIsoDate(range.compareEndExclusive);

  const [
    status,
    kpi,
    backlogOpen,
    prevStatus,
    goals,
    dayPlan,
    topPics,
    categories,
    activities,
    leave
  ] = await Promise.all([
    taskStatusCountsInRange(start, endExclusive),
    taskKpiCountsInRange(start, endExclusive),
    backlogOpenCountInRange(start, endExclusive),
    taskStatusCountsInRange(compareStart, compareEndExclusive),
    goalStatusCountsInRange(start, endExclusive),
    dayPlanCoverageInRange(start, endExclusive),
    topDelayedPicsInRange(start, endExclusive),
    categoryBreakdownInRange(start, endExclusive),
    recentActivitiesInRange(start, endExclusive),
    leaveSnapshot(range)
  ]);

  const prevCompleted = prevStatus.get("done") ?? 0;
  const prevTotal = [...prevStatus.values()].reduce((a, b) => a + b, 0);

  const goalDone = goals.get("done") ?? 0;
  const goalInProgress = goals.get("in_progress") ?? 0;
  const goalPending = goals.get("pending") ?? 0;
  const goalTotal = [...goals.values()].reduce((a, b) => a + b, 0);

  return {
    greetingName,
    period: range.period,
    weekStart: range.weekStart,
    weekLabel: range.label,
    stats: buildStats(status, kpi, backlogOpen, {
      total: prevTotal,
      donePct: pct(prevCompleted, prevTotal)
    }),
    goals: {
      total: goalTotal,
      done: goalDone,
      inProgress: goalInProgress,
      pending: goalPending,
      onTrack: goalDone + goalInProgress
    },
    dayPlan,
    leave,
    topDelayedPics: topPics,
    categories,
    activities
  };
}
