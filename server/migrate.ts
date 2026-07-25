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
  { name: "Ms. Hoàng Thị", avatar_url: null },
  { name: "Ms. Hà Thu", avatar_url: null },
  { name: "Ms. Kim Bắc", avatar_url: null },
  { name: "Mr. Đức Anh", avatar_url: null },
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
      kpi TEXT NOT NULL DEFAULT '',
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

    ALTER TABLE weekly_tasks
      ADD COLUMN IF NOT EXISTS kpi TEXT NOT NULL DEFAULT '';

    ALTER TABLE weekly_tasks
      ALTER COLUMN kpi SET DEFAULT '';

    UPDATE weekly_tasks SET kpi = '' WHERE kpi IN ('none') OR kpi IS NULL;

    CREATE TABLE IF NOT EXISTS personal_goals (
      id SERIAL PRIMARY KEY,
      week_start DATE NOT NULL,
      person_name TEXT NOT NULL DEFAULT '',
      person_avatar TEXT,
      goals TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending',
      progress TEXT NOT NULL DEFAULT '',
      next_focus TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_personal_goals_week_start
      ON personal_goals (week_start);

    CREATE INDEX IF NOT EXISTS idx_personal_goals_week_sort
      ON personal_goals (week_start, sort_order, id);

    CREATE TABLE IF NOT EXISTS personal_day_plans (
      id SERIAL PRIMARY KEY,
      week_start DATE NOT NULL,
      person_name TEXT NOT NULL,
      plan_date DATE NOT NULL,
      end_date DATE,
      title TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      start_minute INTEGER,
      end_minute INTEGER,
      source_type TEXT NOT NULL DEFAULT 'custom',
      source_key TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    ALTER TABLE personal_day_plans
      ADD COLUMN IF NOT EXISTS end_date DATE;

    ALTER TABLE personal_day_plans
      ADD COLUMN IF NOT EXISTS reminder_enabled BOOLEAN NOT NULL DEFAULT FALSE;

    ALTER TABLE personal_day_plans
      ADD COLUMN IF NOT EXISTS reminder_minutes_before INTEGER NOT NULL DEFAULT 15;

    UPDATE personal_day_plans
    SET end_date = plan_date
    WHERE end_date IS NULL;

    CREATE INDEX IF NOT EXISTS idx_day_plans_person_week
      ON personal_day_plans (person_name, week_start, plan_date, sort_order, id);

    CREATE INDEX IF NOT EXISTS idx_day_plans_week_date
      ON personal_day_plans (week_start, plan_date);

    CREATE TABLE IF NOT EXISTS meetings (
      id SERIAL PRIMARY KEY,
      owner_key TEXT NOT NULL DEFAULT 'van-anh',
      week_start DATE NOT NULL,
      weekday SMALLINT NOT NULL CHECK (weekday BETWEEN 2 AND 6),
      start_min INTEGER NOT NULL,
      end_min INTEGER NOT NULL,
      title TEXT NOT NULL DEFAULT '',
      attendees TEXT NOT NULL DEFAULT '',
      location TEXT NOT NULL DEFAULT '',
      note TEXT NOT NULL DEFAULT '',
      kind TEXT NOT NULL DEFAULT 'other',
      is_block BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_meetings_owner_week
      ON meetings (owner_key, week_start, weekday, start_min, id);

    CREATE TABLE IF NOT EXISTS meeting_week_notes (
      id SERIAL PRIMARY KEY,
      owner_key TEXT NOT NULL DEFAULT 'van-anh',
      week_start DATE NOT NULL,
      text TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_meeting_notes_owner_week
      ON meeting_week_notes (owner_key, week_start, id);
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
