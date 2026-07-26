import { query } from "./db";
import { listLoggedInPersonnel, type PersonnelOption } from "./users";

interface PersonnelRow {
  name: string;
  avatar_url: string | null;
}

/**
 * PIC / nhân sự options: prefer users who have logged in.
 * Falls back to seeded `personnel` table only when nobody has logged in yet.
 */
export async function getPersonnelOptions(): Promise<PersonnelOption[]> {
  const loggedIn = listLoggedInPersonnel();
  if (loggedIn.length > 0) return loggedIn;

  const res = await query<PersonnelRow>(
    `SELECT name, avatar_url FROM personnel ORDER BY id ASC`
  );
  return res.rows.map((p) => ({
    name: p.name,
    avatar: p.avatar_url
  }));
}

export async function resolvePersonAvatar(name: string): Promise<string | null> {
  const needle = name.trim();
  if (!needle) return null;

  const fromUsers = listLoggedInPersonnel().find(
    (p) => p.name.trim().toLowerCase() === needle.toLowerCase()
  );
  if (fromUsers) return fromUsers.avatar;

  const res = await query<PersonnelRow>(
    `SELECT name, avatar_url FROM personnel WHERE name = $1 LIMIT 1`,
    [needle]
  );
  return res.rows[0]?.avatar_url ?? null;
}
