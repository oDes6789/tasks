import { query } from "./db";

export interface EdutalkManager {
  id: number;
  name: string;
  email: string | null;
  avatarUrl: string | null;
  employeeCode: number | null;
}

export interface AppUser {
  id: number;
  edutalkUserId: number;
  name: string;
  email: string;
  avatarUrl: string | null;
  employeeCode: number | null;
  parentId: number | null;
  manager: EdutalkManager | null;
  createdAt: number;
}

export interface PublicUser {
  id: number;
  name: string;
  email: string;
  avatarUrl: string | null;
  employeeCode: number | null;
  parentId: number | null;
  manager: EdutalkManager | null;
}

export interface EdutalkUserInput {
  id: number;
  name: string;
  email: string;
  employeeCode?: number | null;
  image?: string | null;
  parent_id?: number | null;
  manager?: {
    id: number;
    name: string;
    email?: string | null;
    image?: string | null;
    employeeCode?: number | null;
  } | null;
}

interface UserRow {
  id: number;
  edutalk_user_id: number;
  name: string;
  email: string;
  avatar_url: string | null;
  employee_code: number | null;
  parent_id: number | null;
  manager_json: EdutalkManager | string | null;
  created_at: Date | string;
}

const usersByEdutalkId = new Map<number, AppUser>();
const usersById = new Map<number, AppUser>();

function normalizeAvatar(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function normalizeManager(
  raw: EdutalkUserInput["manager"] | EdutalkManager | null | undefined
): EdutalkManager | null {
  if (!raw || typeof raw !== "object") return null;
  const id = Number((raw as { id?: unknown }).id);
  if (!Number.isFinite(id) || id <= 0) return null;
  const name = typeof (raw as { name?: unknown }).name === "string" ? (raw as { name: string }).name : "";
  if (!name) return null;
  const emailRaw = (raw as { email?: unknown }).email;
  const employeeCodeRaw =
    (raw as { employeeCode?: unknown }).employeeCode ?? (raw as { employee_code?: unknown }).employee_code;
  const avatarRaw = (raw as { avatarUrl?: unknown }).avatarUrl ?? (raw as { image?: unknown }).image;
  const employeeCode =
    employeeCodeRaw == null || employeeCodeRaw === ""
      ? null
      : Number(employeeCodeRaw);

  return {
    id,
    name,
    email: typeof emailRaw === "string" && emailRaw.trim() ? emailRaw.trim() : null,
    avatarUrl: normalizeAvatar(avatarRaw),
    employeeCode: Number.isFinite(employeeCode) ? employeeCode : null
  };
}

function parseManagerJson(value: UserRow["manager_json"]): EdutalkManager | null {
  if (!value) return null;
  if (typeof value === "string") {
    try {
      return normalizeManager(JSON.parse(value) as EdutalkManager);
    } catch {
      return null;
    }
  }
  return normalizeManager(value);
}

function mapRow(row: UserRow): AppUser {
  return {
    id: row.id,
    edutalkUserId: row.edutalk_user_id,
    name: row.name,
    email: row.email,
    avatarUrl: row.avatar_url,
    employeeCode: row.employee_code,
    parentId: row.parent_id,
    manager: parseManagerJson(row.manager_json),
    createdAt:
      row.created_at instanceof Date
        ? row.created_at.getTime()
        : new Date(row.created_at).getTime()
  };
}

function cacheUser(user: AppUser): void {
  usersByEdutalkId.set(user.edutalkUserId, user);
  usersById.set(user.id, user);
}

export async function loadUsersFromDb(): Promise<void> {
  usersByEdutalkId.clear();
  usersById.clear();
  const res = await query<UserRow>(
    `
    SELECT
      id,
      edutalk_user_id,
      name,
      email,
      avatar_url,
      employee_code,
      parent_id,
      manager_json,
      created_at
    FROM app_users
    ORDER BY id ASC
    `
  );
  for (const row of res.rows) {
    cacheUser(mapRow(row));
  }
}

export async function upsertUserFromEdutalk(input: EdutalkUserInput): Promise<AppUser> {
  const avatarUrl = normalizeAvatar(input.image);
  const employeeCodeNum =
    input.employeeCode == null ? NaN : Number(input.employeeCode);
  const employeeCode = Number.isFinite(employeeCodeNum) ? employeeCodeNum : null;
  const parentIdNum = input.parent_id == null ? NaN : Number(input.parent_id);
  const parentId = Number.isFinite(parentIdNum) && parentIdNum > 0 ? parentIdNum : null;
  const manager = normalizeManager(input.manager);

  const res = await query<UserRow>(
    `
    INSERT INTO app_users (
      edutalk_user_id,
      name,
      email,
      avatar_url,
      employee_code,
      parent_id,
      manager_json
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
    ON CONFLICT (edutalk_user_id) DO UPDATE SET
      name = EXCLUDED.name,
      email = EXCLUDED.email,
      avatar_url = EXCLUDED.avatar_url,
      employee_code = EXCLUDED.employee_code,
      parent_id = EXCLUDED.parent_id,
      manager_json = EXCLUDED.manager_json,
      updated_at = NOW()
    RETURNING
      id,
      edutalk_user_id,
      name,
      email,
      avatar_url,
      employee_code,
      parent_id,
      manager_json,
      created_at
    `,
    [
      input.id,
      input.name,
      input.email,
      avatarUrl,
      employeeCode,
      parentId,
      manager ? JSON.stringify(manager) : null
    ]
  );

  const user = mapRow(res.rows[0]);
  cacheUser(user);
  return user;
}

export function getUserById(id: number): AppUser | null {
  return usersById.get(id) ?? null;
}

export function toPublicUser(user: AppUser): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl,
    employeeCode: user.employeeCode,
    parentId: user.parentId,
    manager: user.manager
  };
}
