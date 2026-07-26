import { query } from "./db";
import {
  isLeaveStatus,
  resolveMonthKey,
  saturdaysInMonth,
  SATURDAY_LEAVE_ROSTER,
  type LeaveStatus,
  type SaturdayLeaveEntry
} from "../src/lib/saturdayLeave";

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

function rosterNameSet(): Set<string> {
  return new Set(SATURDAY_LEAVE_ROSTER.map((p) => p.name));
}

export async function listSaturdayLeave(monthRaw: unknown): Promise<{
  month: string;
  saturdays: string[];
  entries: SaturdayLeaveEntry[];
}> {
  const month = resolveMonthKey(monthRaw);
  const saturdays = saturdaysInMonth(month);
  if (saturdays.length === 0) {
    return { month, saturdays, entries: [] };
  }

  const res = await query<LeaveRow>(
    `
    SELECT ${SELECT}
    FROM saturday_leave_regs
    WHERE work_date = ANY($1::date[])
    ORDER BY work_date, person_name, id
    `,
    [saturdays]
  );

  return {
    month,
    saturdays,
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

  if (!/^\d{4}-\d{2}-\d{2}$/.test(workDate)) {
    throw new Error("INVALID_DATE");
  }
  const d = new Date(`${workDate}T00:00:00`);
  if (Number.isNaN(d.getTime()) || d.getDay() !== 6) {
    throw new Error("NOT_SATURDAY");
  }
  if (!personName || !rosterNameSet().has(personName)) {
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
