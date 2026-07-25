import { query } from "./db";

const CATEGORIES = [
  { id: 1, title: "1. TUYỂN DỤNG" },
  { id: 2, title: "2. ĐÀO TẠO" },
  { id: 3, title: "3. VẬN HÀNH" },
  { id: 4, title: "4. TRIỂN KHAI MỚI" },
  { id: 5, title: "5. OKR" },
  { id: 6, title: "6. VẤN ĐỀ TỒN ĐỌNG" },
  { id: 7, title: "7. ĐỀ XUẤT" },
  { id: 8, title: "8. NOTE" }
] as const;

const PERSONNEL = [
  { name: "Ms. Kim Bắc", avatar_url: null },
  { name: "Mr. Tiến Dũng", avatar_url: null },
  { name: "Ms. Thu Hà", avatar_url: null },
  { name: "Mr. Minh Quân", avatar_url: null },
  { name: "Ms. Lan Anh", avatar_url: null }
] as const;

export async function migrate(): Promise<void> {
  await query(`
    CREATE TABLE IF NOT EXISTS task_categories (
      id INTEGER PRIMARY KEY,
      title TEXT NOT NULL UNIQUE,
      sort_order INTEGER NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS personnel (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      avatar_url TEXT
    );

    CREATE TABLE IF NOT EXISTS weekly_tasks (
      id SERIAL PRIMARY KEY,
      week_start DATE NOT NULL,
      category_id INTEGER NOT NULL REFERENCES task_categories(id),
      item TEXT NOT NULL DEFAULT '',
      objective TEXT NOT NULL DEFAULT '',
      dod TEXT NOT NULL DEFAULT '',
      pics JSONB NOT NULL DEFAULT '[]'::jsonb,
      status TEXT NOT NULL DEFAULT 'pending',
      progress INTEGER,
      progress_note TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_weekly_tasks_week_start
      ON weekly_tasks (week_start);

    CREATE INDEX IF NOT EXISTS idx_weekly_tasks_week_category
      ON weekly_tasks (week_start, category_id, sort_order);
  `);

  for (const cat of CATEGORIES) {
    await query(
      `
      INSERT INTO task_categories (id, title, sort_order)
      VALUES ($1, $2, $3)
      ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, sort_order = EXCLUDED.sort_order
      `,
      [cat.id, cat.title, cat.id]
    );
  }

  for (const person of PERSONNEL) {
    await query(
      `
      INSERT INTO personnel (name, avatar_url)
      VALUES ($1, $2)
      ON CONFLICT (name) DO NOTHING
      `,
      [person.name, person.avatar_url]
    );
  }
}

export { CATEGORIES };
