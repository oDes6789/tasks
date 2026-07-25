import { query } from "./db";
import { CATEGORIES } from "./migrate";
import { formatWeekLabel, resolveWeekStart } from "../src/lib/week";

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
  progress: number | null;
  progressNote: string | null;
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
  progress: number | null;
  progress_note: string | null;
}

interface PersonnelRow {
  name: string;
  avatar_url: string | null;
}

function normalizePics(raw: Pic[] | null | undefined): Pic[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((p) => ({
    name: p.name,
    avatar: p.avatar ?? null
  }));
}

export async function getTaskBoard(weekRaw: unknown): Promise<BoardPayload> {
  const week = resolveWeekStart(weekRaw);

  const [personnelRes, tasksRes] = await Promise.all([
    query<PersonnelRow>(`SELECT name, avatar_url FROM personnel ORDER BY id ASC`),
    query<TaskRow>(
      `
      SELECT id, category_id, item, objective, dod, pics, status, progress, progress_note
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
    list.push({
      id: row.id,
      item: row.item,
      objective: row.objective,
      dod: row.dod,
      pics: normalizePics(row.pics),
      status: row.status,
      progress: row.progress,
      progressNote: row.progress_note
    });
    tasksByCategory.set(row.category_id, list);
  }

  const groups: TaskGroup[] = CATEGORIES.map((cat) => ({
    id: cat.id,
    title: cat.title,
    tasks: tasksByCategory.get(cat.id) ?? []
  }));

  return {
    meta: {
      department: "Phòng Tổ Chức Giáo Viên",
      weekStart: week.weekStart,
      weekLabel: week.weekLabel || formatWeekLabel(week.start),
      deadlineNote: "Deadline: 12h thứ 6 hàng tuần"
    },
    personnel: personnelRes.rows.map((p) => ({
      name: p.name,
      avatar: p.avatar_url
    })),
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
  progress?: number | null;
  progressNote?: string | null;
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

  const res = await query<TaskRow>(
    `
    INSERT INTO weekly_tasks (
      week_start, category_id, item, objective, dod, pics, status, progress, progress_note, sort_order
    )
    VALUES ($1::date, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10)
    RETURNING id, category_id, item, objective, dod, pics, status, progress, progress_note
    `,
    [
      input.weekStart,
      input.categoryId,
      input.item ?? "",
      input.objective ?? "",
      input.dod ?? "",
      pics,
      input.status ?? "pending",
      input.progress ?? null,
      input.progressNote ?? null,
      sortOrder
    ]
  );

  const row = res.rows[0];
  return {
    id: row.id,
    item: row.item,
    objective: row.objective,
    dod: row.dod,
    pics: normalizePics(row.pics),
    status: row.status,
    progress: row.progress,
    progressNote: row.progress_note
  };
}

export async function updateWeeklyTask(
  id: number,
  input: {
    item: string;
    objective: string;
    dod: string;
    pics: Pic[];
    status: string;
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
      progress = $7,
      progress_note = $8,
      updated_at = NOW()
    WHERE id = $1
    RETURNING id, category_id, item, objective, dod, pics, status, progress, progress_note
    `,
    [
      id,
      input.item,
      input.objective,
      input.dod,
      JSON.stringify(input.pics ?? []),
      input.status,
      input.progress,
      input.progressNote
    ]
  );

  const row = res.rows[0];
  if (!row) return null;
  return {
    id: row.id,
    item: row.item,
    objective: row.objective,
    dod: row.dod,
    pics: normalizePics(row.pics),
    status: row.status,
    progress: row.progress,
    progressNote: row.progress_note
  };
}

export async function deleteWeeklyTask(id: number): Promise<boolean> {
  const res = await query(`DELETE FROM weekly_tasks WHERE id = $1`, [id]);
  return (res.rowCount ?? 0) > 0;
}
