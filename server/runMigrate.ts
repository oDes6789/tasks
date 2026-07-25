import dotenv from "dotenv";
import { closePool } from "./db";
import { ensureDatabase } from "./ensureDatabase";
import { migrate } from "./migrate";

dotenv.config();

async function main() {
  await ensureDatabase();
  await migrate();
  console.log("Migrate OK");
  await closePool();
}

main().catch(async (err) => {
  console.error("Migrate failed:", err);
  await closePool().catch(() => undefined);
  process.exit(1);
});
