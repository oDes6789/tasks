import { query } from "./db";
import {
  inferLeaveBrand,
  isLeaveStatus,
  isTeamLeadAccount,
  resolveMonthKey,
  saturdaysInMonth,
  SATURDAY_LEAVE_ROSTER,
  type LeavePerson,
  type LeaveStatus,
  type SaturdayLeaveEntry
} from "../src/lib/saturdayLeave";
import { getAllAppUsers, type AppUser } from "./users";

interface LeaveRow {
  id: number;
  work_date: string;
  person_name: string;
  status: string;
  updated_by: string;
  updated_at: string;
}

const SELECT = `
  id,
  work_date::text AS work_date,
  person_name,
  status,
  updated_by,
  updated_at::text AS updated_at
`;

const BRAND_ORDER: Record<LeavePerson["brand"], number> = {
  general: 0,
  im: 1,
  ec: 2
};

function asIsoDate(value: string): string {
  return value.slice(0, 10);
}

function mapEntry(row: LeaveRow): SaturdayLeaveEntry {
  const status = isLeaveStatus(row.status) ? row.status : "full";
  return {
    id: row.id,
    workDate: asIsoDate(row.work_date),
    personName: row.person_name,
    status,
    updatedBy: row.updated_by ?? "",
    updatedAt: row.updated_at
  };
}

function brandFromUser(user: AppUser): LeavePerson["brand"] {
  if (user.leaveBrand) return user.leaveBrand;
  return inferLeaveBrand(
    `${user.position?.department ?? ""} ${user.position?.accountType?.name ?? ""}`
  );
}

/**
 * Roster for Saturday leave: only accounts with saturdayLeaveTracked enabled.
 * Falls back to the seeded spreadsheet roster when nobody has logged in yet.
 */
export function buildSaturdayLeaveRoster(): LeavePerson[] {
  const users = getAllAppUsers();
  if (users.length === 0) return SATURDAY_LEAVE_ROSTER.map((p) => ({ ...p }));

  return users
    .filter((u) => u.saturdayLeaveTracked && u.name.trim())
    .map((u) => ({
      name: u.name.trim(),
      brand: brandFromUser(u),
      isTeamLead: isTeamLeadAccount(u.position),
      avatar: u.avatarUrl
    }))
    .sort((a, b) => {
      const byBrand = BRAND_ORDER[a.brand] - BRAND_ORDER[b.brand];
      if (byBrand !== 0) return byBrand;
      if (a.isTeamLead !== b.isTeamLead) return a.isTeamLead ? -1 : 1;
      return a.name.localeCompare(b.name, "vi");
    });
}

function rosterNameSet(roster: LeavePerson[]): Set<string> {
  return new Set(roster.map((p) => p.name));
}

export async function listSaturdayLeave(monthRaw: unknown): Promise<{
  month: string;
  saturdays: string[];
  roster: LeavePerson[];
  entries: SaturdayLeaveEntry[];
}> {
  const month = resolveMonthKey(monthRaw);
  const saturdays = saturdaysInMonth(month);
  const roster = buildSaturdayLeaveRoster();
  if (saturdays.length === 0) {
    return { month, saturdays, roster, entries: [] };
  }

  const names = roster.map((p) => p.name);
  if (names.length === 0) {
    return { month, saturdays, roster, entries: [] };
  }

  const res = await query<LeaveRow>(
    `
    SELECT ${SELECT}
    FROM saturday_leave_regs
    WHERE work_date = ANY($1::date[])
      AND person_name = ANY($2::text[])
    ORDER BY work_date, person_name, id
    `,
    [saturdays, names]
  );

  return {
    month,
    saturdays,
    roster,
    entries: res.rows.map(mapEntry)
  };
}

export async function upsertSaturdayLeave(input: {
  workDate: unknown;
  personName: unknown;
  status: unknown;
  updatedBy: string;
}): Promise<SaturdayLeaveEntry> {
  const workDate = String(input.workDate ?? "").slice(0, 10);
  const personName = String(input.personName ?? "").trim();
  const statusRaw = input.status;
  const roster = buildSaturdayLeaveRoster();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(workDate)) {
    throw new Error("INVALID_DATE");
  }
  const d = new Date(`${workDate}T00:00:00`);
  if (Number.isNaN(d.getTime()) || d.getDay() !== 6) {
    throw new Error("NOT_SATURDAY");
  }
  if (!personName || !rosterNameSet(roster).has(personName)) {
    throw new Error("UNKNOWN_PERSON");
  }
  if (!isLeaveStatus(statusRaw)) {
    throw new Error("INVALID_STATUS");
  }

  const status: LeaveStatus = statusRaw;
  const res = await query<LeaveRow>(
    `
    INSERT INTO saturday_leave_regs (work_date, person_name, status, updated_by, updated_at)
    VALUES ($1::date, $2, $3, $4, NOW())
    ON CONFLICT (work_date, person_name) DO UPDATE SET
      status = EXCLUDED.status,
      updated_by = EXCLUDED.updated_by,
      updated_at = NOW()
    RETURNING ${SELECT}
    `,
    [workDate, personName, status, input.updatedBy.slice(0, 120)]
  );

  const row = res.rows[0];
  if (!row) throw new Error("UPSERT_FAILED");
  return mapEntry(row);
}

export async function clearSaturdayLeave(input: {
  workDate: unknown;
  personName: unknown;
}): Promise<boolean> {
  const workDate = String(input.workDate ?? "").slice(0, 10);
  const personName = String(input.personName ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(workDate) || !personName) return false;

  const res = await query(
    `
    DELETE FROM saturday_leave_regs
    WHERE work_date = $1::date AND person_name = $2
    `,
    [workDate, personName]
  );
  return (res.rowCount ?? 0) > 0;
}
