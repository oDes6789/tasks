import pg from "pg";

const DATABASE_NAME = "tasks_manager";

function adminConnectionString(url: string): string {
  const parsed = new URL(url);
  parsed.pathname = "/postgres";
  return parsed.toString();
}

export async function ensureDatabase(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured.");
  }

  const admin = new pg.Client({
    connectionString: adminConnectionString(connectionString),
    connectionTimeoutMillis: 10_000
  });

  await admin.connect();
  try {
    const exists = await admin.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [
      DATABASE_NAME
    ]);
    if (exists.rowCount && exists.rowCount > 0) return;

    await admin.query(`CREATE DATABASE ${DATABASE_NAME}`);
    console.log(`Created database "${DATABASE_NAME}".`);
  } finally {
    await admin.end();
  }
}
