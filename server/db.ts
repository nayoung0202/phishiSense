import Database from "better-sqlite3";
import { drizzle as sqliteDrizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./db/schema";

const databaseUrl = process.env.DATABASE_URL ?? "file:./dev.db";

if (!databaseUrl.startsWith("file:")) {
  throw new Error(
    "현재 단계에서는 SQLite만 지원합니다. DATABASE_URL을 file: 접두사로 시작하도록 설정하세요.",
  );
}

const sqlitePath = databaseUrl.replace(/^file:/, "");
const sqlite = new Database(sqlitePath);

export const db = sqliteDrizzle(sqlite, { schema });
export { schema };
