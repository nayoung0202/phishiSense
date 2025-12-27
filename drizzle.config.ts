import { defineConfig } from "drizzle-kit";

const databaseUrl = process.env.DATABASE_URL ?? "file:./dev.db";
const isSqlite = databaseUrl.startsWith("file:");

export default defineConfig({
  out: "./migrations",
  schema: "./server/db/schema.ts",
  dialect: isSqlite ? "sqlite" : "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
});
