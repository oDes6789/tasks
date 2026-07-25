import { query } from "./db";
import {
  DEFAULT_MEETING_OWNER,
  SEED_MEETINGS,
  SEED_WEEK_NOTES,
  isMeetingKind,
  type Meeting,
  type MeetingKind,
  type WeekNote,
  type Weekday
} from "../src/lib/meetings";
import { resolveWeekStart } from "../src/lib/week";

interface MeetingRow {
  id: number;
  owner_key: string;
  week_start: string;
  weekday: number;
  start_min: number;
  end_min: number;
  title: string;
  attendees: string;
  location: string;
  note: string;
  kind: string;
  is_block: boolean;
}

interface NoteRow {
  id: number;
  owner_key: string;
  week_start: string;
  text: string;
}

const MEETING_SELECT = `
  id,
  owner_key,
  week_start::text AS week_start,
  weekday,
  start_min,
  end_min,
  title,
  attendees,
  location,
  note,
  kind,
  is_block
`;

function asIsoDate(value: string): string {
  return value.slice(0, 10);
}

function clampMin(value: unknown, fallback = 0): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(24 * 60, Math.round(n)));
}

function asWeekday(value: unknown): Weekday {
  const n = Number(value);
  if (n === 2 || n === 3 || n === 4 || n === 5 || n === 6) return n;
  throw new Error("INVALID_WEEKDAY");
}

function mapMeeting(row: MeetingRow): Meeting {
  return {
    id: row.id,
    ownerKey: row.owner_key,
    weekStart: asIsoDate(row.week_start),
    weekday: asWeekday(row.weekday),
    startMin: row.start_min,
    endMin: row.end_min,
    title: row.title ?? "",
    attendees: row.attendees ?? "",
    location: row.location ?? "",
    note: row.note ?? "",
    kind: (isMeetingKind(row.kind) ? row.kind : "other") as MeetingKind,
    isBlock: Boolean(row.is_block)
  };
}

function mapNote(row: NoteRow): WeekNote {
  return {
    id: row.id,
    ownerKey: row.owner_key,
    weekStart: asIsoDate(row.week_start),
    text: row.text ?? ""
  };
}

function normalizeRange(startMin: number, endMin: number): { startMin: number; endMin: number } {
  let start = clampMin(startMin, 8 * 60);
  let end = clampMin(endMin, start + 60);
  if (end <= start) end = Math.min(24 * 60, start + 30);
  return { startMin: start, endMin: end };
}

export async function ensureMeetingSeed(ownerKey = DEFAULT_MEETING_OWNER): Promise<void> {
  const key = ownerKey.trim() || DEFAULT_MEETING_OWNER;
  const countRes = await query<{ c: number }>(
    `SELECT COUNT(*)::int AS c FROM meetings WHERE owner_key = $1`,
    [key]
  );
  if ((countRes.rows[0]?.c ?? 0) > 0) return;

  for (const seed of SEED_MEETINGS) {
    await query(
      `
      INSERT INTO meetings (
        owner_key, week_start, weekday, start_min, end_min,
        title, attendees, location, note, kind, is_block
      ) VALUES (
        $1, $2::date, $3, $4, $5,
        $6, $7, $8, $9, $10, $11
      )
      `,
      [
        key,
        seed.weekStart,
        seed.weekday,
        seed.startMin,
        seed.endMin,
        seed.title,
        seed.attendees,
        seed.location,
        seed.note,
        seed.kind,
        seed.isBlock
      ]
    );
  }

  for (const seed of SEED_WEEK_NOTES) {
    await query(
      `
      INSERT INTO meeting_week_notes (owner_key, week_start, text)
      VALUES ($1, $2::date, $3)
      `,
      [key, seed.weekStart, seed.text]
    );
  }
}

export async function listMeetings(
  ownerKeyRaw: unknown,
  weekRaw: unknown
): Promise<{ meetings: Meeting[]; notes: WeekNote[]; weekStart: string }> {
  const ownerKey = String(ownerKeyRaw ?? DEFAULT_MEETING_OWNER).trim() || DEFAULT_MEETING_OWNER;
  const week = resolveWeekStart(weekRaw);
  await ensureMeetingSeed(ownerKey);

  const [meetingsRes, notesRes] = await Promise.all([
    query<MeetingRow>(
      `
      SELECT ${MEETING_SELECT}
      FROM meetings
      WHERE owner_key = $1 AND week_start = $2::date
      ORDER BY weekday ASC, start_min ASC, id ASC
      `,
      [ownerKey, week.weekStart]
    ),
    query<NoteRow>(
      `
      SELECT id, owner_key, week_start::text AS week_start, text
      FROM meeting_week_notes
      WHERE owner_key = $1 AND week_start = $2::date
      ORDER BY id ASC
      `,
      [ownerKey, week.weekStart]
    )
  ]);

  return {
    weekStart: week.weekStart,
    meetings: meetingsRes.rows.map(mapMeeting),
    notes: notesRes.rows.map(mapNote)
  };
}

export async function createMeeting(input: {
  ownerKey?: string;
  weekStart?: string;
  weekday: unknown;
  startMin: unknown;
  endMin: unknown;
  title?: string;
  attendees?: string;
  location?: string;
  note?: string;
  kind?: string;
  isBlock?: boolean;
}): Promise<Meeting> {
  const ownerKey = String(input.ownerKey ?? DEFAULT_MEETING_OWNER).trim() || DEFAULT_MEETING_OWNER;
  const week = resolveWeekStart(input.weekStart);
  const weekday = asWeekday(input.weekday);
  const range = normalizeRange(clampMin(input.startMin, 9 * 60), clampMin(input.endMin, 10 * 60));
  const kind = isMeetingKind(input.kind) ? input.kind : "other";
  const title = String(input.title ?? "").trim() || "Họp mới";

  const res = await query<MeetingRow>(
    `
    INSERT INTO meetings (
      owner_key, week_start, weekday, start_min, end_min,
      title, attendees, location, note, kind, is_block
    ) VALUES (
      $1, $2::date, $3, $4, $5,
      $6, $7, $8, $9, $10, $11
    )
    RETURNING ${MEETING_SELECT}
    `,
    [
      ownerKey,
      week.weekStart,
      weekday,
      range.startMin,
      range.endMin,
      title,
      String(input.attendees ?? "").trim(),
      String(input.location ?? "").trim(),
      String(input.note ?? "").trim(),
      kind,
      Boolean(input.isBlock)
    ]
  );

  return mapMeeting(res.rows[0]);
}

export async function updateMeeting(
  id: number,
  patch: {
    weekStart?: string;
    weekday?: unknown;
    startMin?: unknown;
    endMin?: unknown;
    title?: string;
    attendees?: string;
    location?: string;
    note?: string;
    kind?: string;
    isBlock?: boolean;
  }
): Promise<Meeting | null> {
  const existing = await query<MeetingRow>(
    `SELECT ${MEETING_SELECT} FROM meetings WHERE id = $1`,
    [id]
  );
  if (!existing.rows[0]) return null;
  const cur = mapMeeting(existing.rows[0]);

  const weekStart = patch.weekStart
    ? resolveWeekStart(patch.weekStart).weekStart
    : cur.weekStart;
  const weekday = patch.weekday !== undefined ? asWeekday(patch.weekday) : cur.weekday;
  const range = normalizeRange(
    patch.startMin !== undefined ? clampMin(patch.startMin, cur.startMin) : cur.startMin,
    patch.endMin !== undefined ? clampMin(patch.endMin, cur.endMin) : cur.endMin
  );
  const kind =
    patch.kind !== undefined
      ? isMeetingKind(patch.kind)
        ? patch.kind
        : cur.kind
      : cur.kind;

  const res = await query<MeetingRow>(
    `
    UPDATE meetings SET
      week_start = $2::date,
      weekday = $3,
      start_min = $4,
      end_min = $5,
      title = $6,
      attendees = $7,
      location = $8,
      note = $9,
      kind = $10,
      is_block = $11,
      updated_at = NOW()
    WHERE id = $1
    RETURNING ${MEETING_SELECT}
    `,
    [
      id,
      weekStart,
      weekday,
      range.startMin,
      range.endMin,
      patch.title !== undefined ? String(patch.title).trim() || cur.title : cur.title,
      patch.attendees !== undefined ? String(patch.attendees).trim() : cur.attendees,
      patch.location !== undefined ? String(patch.location).trim() : cur.location,
      patch.note !== undefined ? String(patch.note).trim() : cur.note,
      kind,
      patch.isBlock !== undefined ? Boolean(patch.isBlock) : cur.isBlock
    ]
  );

  return mapMeeting(res.rows[0]);
}

export async function deleteMeeting(id: number): Promise<boolean> {
  const res = await query(`DELETE FROM meetings WHERE id = $1`, [id]);
  return (res.rowCount ?? 0) > 0;
}

export async function createWeekNote(input: {
  ownerKey?: string;
  weekStart?: string;
  text: string;
}): Promise<WeekNote> {
  const ownerKey = String(input.ownerKey ?? DEFAULT_MEETING_OWNER).trim() || DEFAULT_MEETING_OWNER;
  const week = resolveWeekStart(input.weekStart);
  const text = String(input.text ?? "").trim();
  if (!text) throw new Error("NOTE_REQUIRED");

  const res = await query<NoteRow>(
    `
    INSERT INTO meeting_week_notes (owner_key, week_start, text)
    VALUES ($1, $2::date, $3)
    RETURNING id, owner_key, week_start::text AS week_start, text
    `,
    [ownerKey, week.weekStart, text]
  );
  return mapNote(res.rows[0]);
}

export async function deleteWeekNote(id: number): Promise<boolean> {
  const res = await query(`DELETE FROM meeting_week_notes WHERE id = $1`, [id]);
  return (res.rowCount ?? 0) > 0;
}
