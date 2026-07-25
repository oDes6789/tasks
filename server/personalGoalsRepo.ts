import { query } from "./db";
import { formatDeadlineNote, formatWeekLabel, resolveWeekStart } from "../src/lib/week";

export interface PersonnelOption {
  name: string;
  avatar?: string | null;
}

export interface PersonalGoal {
  id: number;
  personName: string;
  personAvatar: string | null;
  goals: string;
  status: string;
  progress: string;
  nextFocus: string;
}

export interface PersonalGoalsBoard {
  meta: {
    weekStart: string;
    weekLabel: string;
    deadlineNote: string;
  };
  personnel: PersonnelOption[];
  rows: PersonalGoal[];
}

interface GoalRow {
  id: number;
  person_name: string;
  person_avatar: string | null;
  goals: string;
  status: string;
  progress: string;
  next_focus: string;
}

interface PersonnelRow {
  name: string;
  avatar_url: string | null;
}

const GOAL_SELECT =
  "id, person_name, person_avatar, goals, status, progress, next_focus";

function mapGoal(row: GoalRow): PersonalGoal {
  return {
    id: row.id,
    personName: row.person_name ?? "",
    personAvatar: row.person_avatar,
    goals: row.goals ?? "",
    status: row.status || "pending",
    progress: row.progress ?? "",
    nextFocus: row.next_focus ?? ""
  };
}

export async function getPersonalGoalsBoard(weekRaw: unknown): Promise<PersonalGoalsBoard> {
  const week = resolveWeekStart(weekRaw);

  const [personnelRes, goalsRes] = await Promise.all([
    query<PersonnelRow>(`SELECT name, avatar_url FROM personnel ORDER BY id ASC`),
    query<GoalRow>(
      `
      SELECT ${GOAL_SELECT}
      FROM personal_goals
      WHERE week_start = $1::date
      ORDER BY sort_order ASC, id ASC
      `,
      [week.weekStart]
    )
  ]);

  return {
    meta: {
      weekStart: week.weekStart,
      weekLabel: week.weekLabel || formatWeekLabel(week.start),
      deadlineNote: formatDeadlineNote(week.start)
    },
    personnel: personnelRes.rows.map((p) => ({
      name: p.name,
      avatar: p.avatar_url
    })),
    rows: goalsRes.rows.map(mapGoal)
  };
}

export async function createPersonalGoal(input: {
  weekStart: string;
  personName?: string;
  personAvatar?: string | null;
  goals?: string;
  status?: string;
  progress?: string;
  nextFocus?: string;
}): Promise<PersonalGoal> {
  const sortRes = await query<{ next_sort: number }>(
    `
    SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_sort
    FROM personal_goals
    WHERE week_start = $1::date
    `,
    [input.weekStart]
  );

  const sortOrder = sortRes.rows[0]?.next_sort ?? 0;

  const res = await query<GoalRow>(
    `
    INSERT INTO personal_goals (
      week_start, person_name, person_avatar, goals, status, progress, next_focus, sort_order
    )
    VALUES ($1::date, $2, $3, $4, $5, $6, $7, $8)
    RETURNING ${GOAL_SELECT}
    `,
    [
      input.weekStart,
      input.personName ?? "",
      input.personAvatar ?? null,
      input.goals ?? "",
      input.status ?? "pending",
      input.progress ?? "",
      input.nextFocus ?? "",
      sortOrder
    ]
  );

  return mapGoal(res.rows[0]);
}

export async function updatePersonalGoal(
  id: number,
  input: {
    personName: string;
    personAvatar: string | null;
    goals: string;
    status: string;
    progress: string;
    nextFocus: string;
  }
): Promise<PersonalGoal | null> {
  const res = await query<GoalRow>(
    `
    UPDATE personal_goals
    SET
      person_name = $2,
      person_avatar = $3,
      goals = $4,
      status = $5,
      progress = $6,
      next_focus = $7,
      updated_at = NOW()
    WHERE id = $1
    RETURNING ${GOAL_SELECT}
    `,
    [
      id,
      input.personName,
      input.personAvatar,
      input.goals,
      input.status,
      input.progress,
      input.nextFocus
    ]
  );

  const row = res.rows[0];
  if (!row) return null;
  return mapGoal(row);
}

export async function deletePersonalGoal(id: number): Promise<boolean> {
  const res = await query(`DELETE FROM personal_goals WHERE id = $1`, [id]);
  return (res.rowCount ?? 0) > 0;
}
