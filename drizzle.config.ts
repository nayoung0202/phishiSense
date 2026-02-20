const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL이 설정되지 않았습니다. PostgreSQL 연결 문자열을 지정하세요.");
}

export default {
  out: "./migrations",
  schema: "./src/server/db/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
};
