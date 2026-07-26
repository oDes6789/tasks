import { query } from "./db";
import { findAppUserByName, personNamesMatch } from "./users";

export type NoticeType =
  | "task"
  | "goal"
  | "leave"
  | "day_plan"
  | "meeting"
  | "system"
  | "info";

export interface Notice {
  id: number;
  userId: number;
  type: NoticeType;
  title: string;
  body: string;
  link: string | null;
  actorName: string;
  meta: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
}

interface NoticeRow {
  id: number;
  user_id: number;
  type: string;
  title: string;
  body: string;
  link: string | null;
  actor_name: string;
  meta: Record<string, unknown> | string | null;
  read_at: Date | string | null;
  created_at: Date | string;
}

function toIso(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();
  const ts = Date.parse(String(value));
  return Number.isFinite(ts) ? new Date(ts).toISOString() : String(value);
}

function parseMeta(raw: NoticeRow["meta"]): Record<string, unknown> {
  if (!raw) return {};
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as unknown;
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  }
  return typeof raw === "object" && !Array.isArray(raw) ? raw : {};
}

function mapRow(row: NoticeRow): Notice {
  return {
    id: row.id,
    userId: row.user_id,
    type: (row.type || "info") as NoticeType,
    title: row.title,
    body: row.body ?? "",
    link: row.link,
    actorName: row.actor_name ?? "",
    meta: parseMeta(row.meta),
    readAt: toIso(row.read_at),
    createdAt: toIso(row.created_at) || new Date().toISOString()
  };
}

const NOTICE_SELECT = `
  id, user_id, type, title, body, link, actor_name, meta, read_at, created_at
`;

export async function listNoticesForUser(
  userId: number,
  options?: { limit?: number; unreadOnly?: boolean }
): Promise<Notice[]> {
  const limit = Math.min(Math.max(options?.limit ?? 30, 1), 100);
  const unreadOnly = Boolean(options?.unreadOnly);
  const res = await query<NoticeRow>(
    `
    SELECT ${NOTICE_SELECT}
    FROM notices
    WHERE user_id = $1
      ${unreadOnly ? "AND read_at IS NULL" : ""}
    ORDER BY created_at DESC, id DESC
    LIMIT $2
    `,
    [userId, limit]
  );
  return res.rows.map(mapRow);
}

export async function countUnreadNotices(userId: number): Promise<number> {
  const res = await query<{ count: string }>(
    `
    SELECT COUNT(*)::text AS count
    FROM notices
    WHERE user_id = $1 AND read_at IS NULL
    `,
    [userId]
  );
  return Number(res.rows[0]?.count ?? 0) || 0;
}

export async function createNotice(input: {
  userId: number;
  type?: NoticeType;
  title: string;
  body?: string;
  link?: string | null;
  actorName?: string;
  meta?: Record<string, unknown>;
}): Promise<Notice | null> {
  const title = String(input.title ?? "").trim().slice(0, 240);
  if (!title || !Number.isInteger(input.userId) || input.userId < 1) return null;

  const res = await query<NoticeRow>(
    `
    INSERT INTO notices (user_id, type, title, body, link, actor_name, meta)
    VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
    RETURNING ${NOTICE_SELECT}
    `,
    [
      input.userId,
      input.type ?? "info",
      title,
      String(input.body ?? "").trim().slice(0, 1000),
      input.link?.trim() || null,
      String(input.actorName ?? "").trim().slice(0, 120),
      JSON.stringify(input.meta ?? {})
    ]
  );
  return res.rows[0] ? mapRow(res.rows[0]) : null;
}

/** Create the same notice for many users; skips actor and duplicates. */
export async function createNoticesForUsers(input: {
  userIds: number[];
  excludeUserId?: number | null;
  type?: NoticeType;
  title: string;
  body?: string;
  link?: string | null;
  actorName?: string;
  meta?: Record<string, unknown>;
}): Promise<number> {
  const exclude = input.excludeUserId ?? null;
  const unique = Array.from(
    new Set(input.userIds.filter((id) => Number.isInteger(id) && id > 0 && id !== exclude))
  );
  let created = 0;
  for (const userId of unique) {
    const notice = await createNotice({
      userId,
      type: input.type,
      title: input.title,
      body: input.body,
      link: input.link,
      actorName: input.actorName,
      meta: input.meta
    });
    if (notice) created += 1;
  }
  return created;
}

/** Resolve person names → app user ids and create notices. */
export async function notifyPeopleByName(input: {
  names: Array<string | null | undefined>;
  excludeUserId?: number | null;
  excludeName?: string | null;
  type?: NoticeType;
  title: string;
  body?: string;
  link?: string | null;
  actorName?: string;
  meta?: Record<string, unknown>;
}): Promise<number> {
  const userIds: number[] = [];
  for (const name of input.names) {
    if (input.excludeName && personNamesMatch(name, input.excludeName)) continue;
    const user = findAppUserByName(name);
    if (user) userIds.push(user.id);
  }
  return createNoticesForUsers({
    userIds,
    excludeUserId: input.excludeUserId,
    type: input.type,
    title: input.title,
    body: input.body,
    link: input.link,
    actorName: input.actorName,
    meta: input.meta
  });
}

export async function markNoticeRead(
  userId: number,
  noticeId: number
): Promise<Notice | null> {
  const res = await query<NoticeRow>(
    `
    UPDATE notices
    SET read_at = COALESCE(read_at, NOW())
    WHERE id = $1 AND user_id = $2
    RETURNING ${NOTICE_SELECT}
    `,
    [noticeId, userId]
  );
  return res.rows[0] ? mapRow(res.rows[0]) : null;
}

export async function markAllNoticesRead(userId: number): Promise<number> {
  const res = await query<{ count: string }>(
    `
    WITH updated AS (
      UPDATE notices
      SET read_at = NOW()
      WHERE user_id = $1 AND read_at IS NULL
      RETURNING id
    )
    SELECT COUNT(*)::text AS count FROM updated
    `,
    [userId]
  );
  return Number(res.rows[0]?.count ?? 0) || 0;
}
