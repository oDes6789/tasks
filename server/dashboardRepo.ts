import { query } from "./db";
import {
  addDays,
  formatWeekLabel,
  resolveWeekStart,
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

async function leaveSnapshot(monthKey: string): Promise<DashboardSummary["leave"]> {
  const { saturdays, roster, entries } = await listSaturdayLeave(monthKey);
  const statusByPerson = new Map<string, LeaveStatus | null>();
  for (const entry of entries) {
    statusByPerson.set(`${entry.personName}::${entry.workDate}`, entry.status);
  }

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
    month: monthKey,
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
  greetingName: string
): Promise<DashboardSummary> {
  const week = resolveWeekStart(weekRaw);
  const prevWeekStart = toIsoDate(addDays(week.start, -7));
  const monthKey = toMonthKey(week.start);

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
    taskStatusCounts(week.weekStart),
    taskKpiCounts(week.weekStart),
    backlogOpenCount(week.weekStart),
    taskStatusCounts(prevWeekStart),
    goalStatusCounts(week.weekStart),
    dayPlanCoverage(week.weekStart),
    topDelayedPics(week.weekStart),
    categoryBreakdown(week.weekStart),
    recentActivities(week.weekStart),
    leaveSnapshot(monthKey)
  ]);

  const prevCompleted = prevStatus.get("done") ?? 0;
  const prevTotal = [...prevStatus.values()].reduce((a, b) => a + b, 0);

  const goalDone = goals.get("done") ?? 0;
  const goalInProgress = goals.get("in_progress") ?? 0;
  const goalPending = goals.get("pending") ?? 0;
  const goalTotal = [...goals.values()].reduce((a, b) => a + b, 0);

  return {
    greetingName,
    weekStart: week.weekStart,
    weekLabel: week.weekLabel || formatWeekLabel(week.start),
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
