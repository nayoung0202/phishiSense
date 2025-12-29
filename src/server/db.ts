import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./db/schema";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("[db] DATABASE_URL이 설정되지 않았습니다. PostgreSQL 연결 문자열을 지정하세요.");
}

const pool = new Pool({ connectionString: databaseUrl });

export const db = drizzle(pool, { schema });
export { schema, pool };
