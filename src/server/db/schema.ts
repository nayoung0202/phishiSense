import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import {
  users,
  projects,
  templates,
  targets,
  trainingPages,
  projectTargets,
  sendJobs,
  reportTemplates,
  reportInstances,
  authSessions,
  reportSettings,
} from "@shared/schema";

const timestampColumn = (column: string) => timestamp(column);

export {
  users,
  projects,
  templates,
  targets,
  trainingPages,
  projectTargets,
  sendJobs,
  reportTemplates,
  reportInstances,
  authSessions,
  reportSettings,
};

export const smtpAccountsTable = pgTable("smtp_accounts", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  host: text("host").notNull(),
  port: integer("port").notNull(),
  secure: boolean("secure").notNull().default(false),
  securityMode: text("security_mode").notNull(),
  username: text("username"),
  passwordEnc: text("password_enc").notNull(),
  fromEmail: text("from_email"),
  fromName: text("from_name"),
  replyTo: text("reply_to"),
  tlsVerify: boolean("tls_verify").notNull().default(true),
  rateLimitPerMin: integer("rate_limit_per_min").notNull().default(60),
  allowedDomainsJson: text("allowed_domains_json"),
  isActive: boolean("is_active").notNull().default(true),
  lastTestedAt: timestampColumn("last_tested_at"),
  lastTestStatus: text("last_test_status"),
  lastTestError: text("last_test_error"),
  createdAt: timestampColumn("created_at").defaultNow(),
  updatedAt: timestampColumn("updated_at").defaultNow(),
});

export const platformEntitlements = pgTable(
  "platform_entitlements",
  {
    tenantId: text("tenant_id").notNull(),
    productId: text("product_id").notNull(),
    planCode: text("plan_code"),
    status: text("status").notNull(),
    seatLimit: integer("seat_limit"),
    expiresAt: timestampColumn("expires_at"),
    sourceType: text("source_type"),
    lastEventId: text("last_event_id"),
    createdAt: timestampColumn("created_at").defaultNow(),
    updatedAt: timestampColumn("updated_at").defaultNow(),
  },
  (table) => ({
    tenantProductUnique: uniqueIndex("platform_entitlements_tenant_product_idx").on(
      table.tenantId,
      table.productId,
    ),
  }),
);

export const platformEntitlementEvents = pgTable("platform_entitlement_events", {
  eventId: text("event_id").primaryKey(),
  eventType: text("event_type").notNull(),
  tenantId: text("tenant_id").notNull(),
  productId: text("product_id").notNull(),
  occurredAt: timestampColumn("occurred_at"),
  keyId: text("key_id"),
  createdAt: timestampColumn("created_at").defaultNow(),
});

export type TemplateRow = typeof templates.$inferSelect;
export type NewTemplateRow = typeof templates.$inferInsert;
export type SmtpAccountRow = typeof smtpAccountsTable.$inferSelect;
export type NewSmtpAccountRow = typeof smtpAccountsTable.$inferInsert;
export type PlatformEntitlementRow = typeof platformEntitlements.$inferSelect;
export type NewPlatformEntitlementRow = typeof platformEntitlements.$inferInsert;
export type PlatformEntitlementEventRow = typeof platformEntitlementEvents.$inferSelect;
