import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

const timestamp = (column: string) =>
  integer(column, { mode: "timestamp_ms" }).$defaultFn(() => new Date());

export const templatesTable = sqliteTable("templates", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  subject: text("subject").notNull(),
  htmlBody: text("html_body").notNull(),
  phishingBody: text("phishing_body"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const smtpAccountsTable = sqliteTable("smtp_accounts", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  host: text("host").notNull(),
  port: integer("port").notNull(),
  secure: integer("secure", { mode: "boolean" }).notNull().default(false),
  securityMode: text("security_mode").notNull(),
  username: text("username"),
  passwordEnc: text("password_enc").notNull(),
  fromEmail: text("from_email"),
  fromName: text("from_name"),
  replyTo: text("reply_to"),
  tlsVerify: integer("tls_verify", { mode: "boolean" }).notNull().default(true),
  rateLimitPerMin: integer("rate_limit_per_min").notNull().default(60),
  allowedDomainsJson: text("allowed_domains_json"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  lastTestedAt: integer("last_tested_at", { mode: "timestamp_ms" }),
  lastTestStatus: text("last_test_status"),
  lastTestError: text("last_test_error"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export type TemplateRow = typeof templatesTable.$inferSelect;
export type NewTemplateRow = typeof templatesTable.$inferInsert;
export type SmtpAccountRow = typeof smtpAccountsTable.$inferSelect;
export type NewSmtpAccountRow = typeof smtpAccountsTable.$inferInsert;
