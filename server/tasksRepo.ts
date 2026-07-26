import { query } from "./db";
import { CATEGORIES } from "./migrate";
import { getPersonnelOptions } from "./personnel";
import { formatDeadlineNote, formatWeekLabel, resolveWeekStart } from "../src/lib/week";

export interface Pic {
  name: string;
  avatar?: string | null;
}

export interface WeeklyTask {
  id: number;
  item: string;
  objective: string;
  dod: string;
  pics: Pic[];
  status: string;
  kpi: string;
  progress: number | null;
  progressNote: string | null;
  createdBy: string;
}

export interface TaskGroup {
  id: number;
  title: string;
  tasks: WeeklyTask[];
}

export interface BoardPayload {
  meta: {
    department: string;
    weekStart: string;
    weekLabel: string;
    deadlineNote: string;
  };
  personnel: Pic[];
  groups: TaskGroup[];
}

interface TaskRow {
  id: number;
  category_id: number;
  item: string;
  objective: string;
  dod: string;
  pics: Pic[] | null;
  status: string;
  kpi: string;
  progress: number | null;
  progress_note: string | null;
  created_by: string | null;
}

function normalizePics(raw: Pic[] | null | undefined): Pic[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((p) => ({
    name: p.name,
    avatar: p.avatar ?? null
  }));
}

function mapTask(row: TaskRow): WeeklyTask {
  return {
    id: row.id,
    item: row.item,
    objective: row.objective,
    dod: row.dod,
    pics: normalizePics(row.pics),
    status: row.status,
    kpi: row.kpi === "none" ? "" : (row.kpi ?? ""),
    progress: row.progress,
    progressNote: row.progress_note,
    createdBy: row.created_by ?? ""
  };
}

const TASK_SELECT =
  "id, category_id, item, objective, dod, pics, status, kpi, progress, progress_note, COALESCE(created_by, '') AS created_by";

export async function getTaskBoard(weekRaw: unknown): Promise<BoardPayload> {
  const week = resolveWeekStart(weekRaw);

  const [personnel, tasksRes] = await Promise.all([
    getPersonnelOptions(),
    query<TaskRow>(
      `
      SELECT ${TASK_SELECT}
      FROM weekly_tasks
      WHERE week_start = $1::date
      ORDER BY category_id ASC, sort_order ASC, id ASC
      `,
      [week.weekStart]
    )
  ]);

  const tasksByCategory = new Map<number, WeeklyTask[]>();
  for (const row of tasksRes.rows) {
    const list = tasksByCategory.get(row.category_id) ?? [];
    list.push(mapTask(row));
    tasksByCategory.set(row.category_id, list);
  }

  const groups: TaskGroup[] = CATEGORIES.map((cat) => ({
    id: cat.id,
    title: cat.title,
    tasks: tasksByCategory.get(cat.id) ?? []
  }));

  return {
    meta: {
      department: "",
      weekStart: week.weekStart,
      weekLabel: week.weekLabel || formatWeekLabel(week.start),
      deadlineNote: formatDeadlineNote(week.start)
    },
    personnel,
    groups
  };
}

export async function createWeeklyTask(input: {
  weekStart: string;
  categoryId: number;
  item?: string;
  objective?: string;
  dod?: string;
  pics?: Pic[];
  status?: string;
  kpi?: string;
  progress?: number | null;
  progressNote?: string | null;
  createdBy?: string;
}): Promise<WeeklyTask> {
  const sortRes = await query<{ next_sort: number }>(
    `
    SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_sort
    FROM weekly_tasks
    WHERE week_start = $1::date AND category_id = $2
    `,
    [input.weekStart, input.categoryId]
  );

  const sortOrder = sortRes.rows[0]?.next_sort ?? 0;
  const pics = JSON.stringify(input.pics ?? []);
  const createdBy = (input.createdBy ?? "").trim().slice(0, 120);

  const res = await query<TaskRow>(
    `
    INSERT INTO weekly_tasks (
      week_start, category_id, item, objective, dod, pics, status, kpi, progress, progress_note, sort_order, created_by
    )
    VALUES ($1::date, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10, $11, $12)
    RETURNING ${TASK_SELECT}
    `,
    [
      input.weekStart,
      input.categoryId,
      input.item ?? "",
      input.objective ?? "",
      input.dod ?? "",
      pics,
      input.status ?? "pending",
      input.kpi ?? "",
      input.progress ?? null,
      input.progressNote ?? null,
      sortOrder,
      createdBy
    ]
  );

  return mapTask(res.rows[0]);
}

export async function updateWeeklyTask(
  id: number,
  input: {
    item: string;
    objective: string;
    dod: string;
    pics: Pic[];
    status: string;
    kpi: string;
    progress: number | null;
    progressNote: string | null;
  }
): Promise<WeeklyTask | null> {
  const res = await query<TaskRow>(
    `
    UPDATE weekly_tasks
    SET
      item = $2,
      objective = $3,
      dod = $4,
      pics = $5::jsonb,
      status = $6,
      kpi = $7,
      progress = $8,
      progress_note = $9,
      updated_at = NOW()
    WHERE id = $1
    RETURNING ${TASK_SELECT}
    `,
    [
      id,
      input.item,
      input.objective,
      input.dod,
      JSON.stringify(input.pics ?? []),
      input.status,
      input.kpi,
      input.progress,
      input.progressNote
    ]
  );

  const row = res.rows[0];
  if (!row) return null;
  return mapTask(row);
}

export async function deleteWeeklyTask(id: number): Promise<boolean> {
  const res = await query(`DELETE FROM weekly_tasks WHERE id = $1`, [id]);
  return (res.rowCount ?? 0) > 0;
}
