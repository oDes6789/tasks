import { query } from "./db";
import {
  isDepartmentHeadAccount,
  isLeaveBrand,
  isTeamLeadAccount,
  type LeaveBrand
} from "../src/lib/saturdayLeave";

export interface EdutalkManager {
  id: number;
  name: string;
  email: string | null;
  avatarUrl: string | null;
  employeeCode: number | null;
}

export interface EdutalkAccountType {
  id: number;
  name: string;
  slug: string | null;
}

export interface EdutalkPosition {
  accountType: EdutalkAccountType | null;
  department: string | null;
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
  position: EdutalkPosition | null;
  /** Manual brand for Saturday leave grouping (null = unset / infer). */
  leaveBrand: LeaveBrand | null;
  /** When false, account is hidden from Saturday leave tracking. */
  saturdayLeaveTracked: boolean;
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
  position: EdutalkPosition | null;
  leaveBrand: LeaveBrand | null;
  saturdayLeaveTracked: boolean;
  isTeamLead: boolean;
  createdAt: number;
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
  account_type?: {
    id?: number | null;
    name?: string | null;
    slug?: string | null;
  } | null;
  department?: string | null;
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
  position_json: EdutalkPosition | string | null;
  leave_brand: string | null;
  saturday_leave_tracked: boolean;
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

function normalizeAccountType(
  raw: EdutalkUserInput["account_type"] | EdutalkAccountType | null | undefined
): EdutalkAccountType | null {
  if (!raw || typeof raw !== "object") return null;
  const id = Number((raw as { id?: unknown }).id);
  const name = typeof (raw as { name?: unknown }).name === "string" ? (raw as { name: string }).name.trim() : "";
  if (!Number.isFinite(id) || id <= 0 || !name) return null;
  const slugRaw = (raw as { slug?: unknown }).slug;
  return {
    id,
    name,
    slug: typeof slugRaw === "string" && slugRaw.trim() ? slugRaw.trim() : null
  };
}

function normalizePosition(input: EdutalkUserInput): EdutalkPosition | null {
  const accountType = normalizeAccountType(input.account_type);
  const department =
    typeof input.department === "string" && input.department.trim()
      ? input.department.trim()
      : null;

  if (!accountType && !department) return null;
  return { accountType, department };
}

function parseJsonField<T>(
  value: T | string | null | undefined,
  normalize: (raw: T | null | undefined) => T | null
): T | null {
  if (!value) return null;
  if (typeof value === "string") {
    try {
      return normalize(JSON.parse(value) as T);
    } catch {
      return null;
    }
  }
  return normalize(value);
}

function normalizeLeaveBrand(raw: unknown): LeaveBrand | null {
  if (raw == null || raw === "") return null;
  return isLeaveBrand(raw) ? raw : null;
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
    manager: parseJsonField(row.manager_json, (raw) => normalizeManager(raw as EdutalkManager)),
    position: parseJsonField(row.position_json, (raw) => {
      if (!raw || typeof raw !== "object") return null;
      const p = raw as EdutalkPosition & {
        businessLevel?: unknown;
        positions?: unknown;
      };
      const accountType = normalizeAccountType(p.accountType);
      const department =
        typeof p.department === "string" && p.department.trim() ? p.department.trim() : null;
      if (!accountType && !department) return null;
      return { accountType, department };
    }),
    leaveBrand: normalizeLeaveBrand(row.leave_brand),
    saturdayLeaveTracked: Boolean(row.saturday_leave_tracked),
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

const USER_SELECT = `
  id,
  edutalk_user_id,
  name,
  email,
  avatar_url,
  employee_code,
  parent_id,
  manager_json,
  position_json,
  leave_brand,
  saturday_leave_tracked,
  created_at
`;

export async function loadUsersFromDb(): Promise<void> {
  usersByEdutalkId.clear();
  usersById.clear();
  const res = await query<UserRow>(
    `
    SELECT ${USER_SELECT}
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
  const position = normalizePosition(input);

  const res = await query<UserRow>(
    `
    INSERT INTO app_users (
      edutalk_user_id,
      name,
      email,
      avatar_url,
      employee_code,
      parent_id,
      manager_json,
      position_json
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb)
    ON CONFLICT (edutalk_user_id) DO UPDATE SET
      name = EXCLUDED.name,
      email = EXCLUDED.email,
      avatar_url = EXCLUDED.avatar_url,
      employee_code = EXCLUDED.employee_code,
      parent_id = EXCLUDED.parent_id,
      manager_json = EXCLUDED.manager_json,
      position_json = EXCLUDED.position_json,
      updated_at = NOW()
    RETURNING ${USER_SELECT}
    `,
    [
      input.id,
      input.name,
      input.email,
      avatarUrl,
      employeeCode,
      parentId,
      manager ? JSON.stringify(manager) : null,
      position ? JSON.stringify(position) : null
    ]
  );

  const user = mapRow(res.rows[0]);
  cacheUser(user);
  return user;
}

export function getUserById(id: number): AppUser | null {
  return usersById.get(id) ?? null;
}

/** All cached app users (logged in via Edutalk). */
export function getAllAppUsers(): AppUser[] {
  return Array.from(usersById.values());
}

export function isAppUserTeamLead(user: AppUser | PublicUser | null | undefined): boolean {
  if (!user) return false;
  return isTeamLeadAccount(user.position);
}

export function isAppUserDepartmentHead(user: AppUser | PublicUser | null | undefined): boolean {
  if (!user) return false;
  return isDepartmentHeadAccount(user.position);
}

/** Fuzzy name match (handles Mr./Ms. prefixes and partial overlap). */
export function personNamesMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  const left = String(a ?? "").trim().toLowerCase();
  const right = String(b ?? "").trim().toLowerCase();
  if (!left || !right) return false;
  if (left === right) return true;
  const leftBare = left.replace(/^m[rs]\.\s*/i, "");
  const rightBare = right.replace(/^m[rs]\.\s*/i, "");
  if (leftBare === rightBare) return true;
  return right.includes(left) || left.includes(rightBare) || right.includes(leftBare);
}

export function findAppUserByName(name: string | null | undefined): AppUser | null {
  const target = String(name ?? "").trim();
  if (!target) return null;
  return getAllAppUsers().find((u) => personNamesMatch(u.name, target)) ?? null;
}

/** True when createdBy refers to a logged-in trưởng phòng. */
export function isCreatedByDepartmentHead(createdBy: string | null | undefined): boolean {
  const creator = findAppUserByName(createdBy);
  return creator ? isAppUserDepartmentHead(creator) : false;
}

/** True when actor may manage this person's records (self or trưởng phòng). */
export function canManagePersonRecord(
  actor: AppUser | PublicUser | null | undefined,
  personName: string
): boolean {
  if (!actor) return false;
  if (isAppUserDepartmentHead(actor)) return true;
  return personNamesMatch(actor.name, personName);
}

/** True when actor may edit this person's Saturday leave (self or trưởng phòng). */
export function canEditSaturdayLeaveFor(
  actor: AppUser | PublicUser | null | undefined,
  personName: string
): boolean {
  return canManagePersonRecord(actor, personName);
}

export interface PersonnelOption {
  name: string;
  avatar: string | null;
}

/** People who have logged in (app_users) — source for PIC / nhân sự selectors. */
export function listLoggedInPersonnel(): PersonnelOption[] {
  return Array.from(usersById.values())
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, "vi"))
    .map((u) => ({
      name: u.name,
      avatar: u.avatarUrl
    }));
}

export function listPublicUsers(): PublicUser[] {
  return Array.from(usersById.values())
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, "vi"))
    .map(toPublicUser);
}

export function findLoggedInPersonnelByName(name: string): PersonnelOption | null {
  const needle = name.trim().toLowerCase();
  if (!needle) return null;
  for (const u of usersById.values()) {
    if (u.name.trim().toLowerCase() === needle) {
      return { name: u.name, avatar: u.avatarUrl };
    }
  }
  return null;
}

export async function updateUserLeaveSettings(
  id: number,
  input: {
    leaveBrand?: LeaveBrand | null;
    saturdayLeaveTracked?: boolean;
  }
): Promise<AppUser | null> {
  if (!Number.isInteger(id) || id <= 0) return null;
  const existing = usersById.get(id);
  if (!existing) return null;

  const leaveBrand =
    input.leaveBrand !== undefined ? normalizeLeaveBrand(input.leaveBrand) : existing.leaveBrand;
  const saturdayLeaveTracked =
    input.saturdayLeaveTracked !== undefined
      ? Boolean(input.saturdayLeaveTracked)
      : existing.saturdayLeaveTracked;

  const res = await query<UserRow>(
    `
    UPDATE app_users
    SET
      leave_brand = $2,
      saturday_leave_tracked = $3,
      updated_at = NOW()
    WHERE id = $1
    RETURNING ${USER_SELECT}
    `,
    [id, leaveBrand, saturdayLeaveTracked]
  );

  const row = res.rows[0];
  if (!row) return null;
  const user = mapRow(row);
  cacheUser(user);
  return user;
}

export async function deleteUserById(id: number): Promise<boolean> {
  if (!Number.isInteger(id) || id <= 0) return false;
  const existing = usersById.get(id);
  if (!existing) return false;

  const res = await query(`DELETE FROM app_users WHERE id = $1`, [id]);
  if ((res.rowCount ?? 0) <= 0) return false;

  usersById.delete(id);
  usersByEdutalkId.delete(existing.edutalkUserId);
  return true;
}

export function toPublicUser(user: AppUser): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl,
    employeeCode: user.employeeCode,
    parentId: user.parentId,
    manager: user.manager,
    position: user.position,
    leaveBrand: user.leaveBrand,
    saturdayLeaveTracked: user.saturdayLeaveTracked,
    isTeamLead: isAppUserTeamLead(user),
    createdAt: user.createdAt
  };
}
