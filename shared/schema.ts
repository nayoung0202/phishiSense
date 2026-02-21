import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  timestamp,
  integer,
  boolean,
  decimal,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  department: text("department"),
  departmentTags: text("department_tags").array(),
  templateId: varchar("template_id"),
  trainingPageId: varchar("training_page_id"),
  trainingLinkToken: text("training_link_token").unique(),
  sendingDomain: text("sending_domain"),
  fromName: text("from_name"),
  fromEmail: text("from_email"),
  timezone: text("timezone"),
  notificationEmails: text("notification_emails").array(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  status: text("status").notNull(), // 임시, 예약, 진행중, 완료
  targetCount: integer("target_count").default(0),
  openCount: integer("open_count").default(0),
  clickCount: integer("click_count").default(0),
  submitCount: integer("submit_count").default(0),
  reportCaptureInboxFileKey: text("report_capture_inbox_file_key"),
  reportCaptureEmailFileKey: text("report_capture_email_file_key"),
  reportCaptureMaliciousFileKey: text("report_capture_malicious_file_key"),
  reportCaptureTrainingFileKey: text("report_capture_training_file_key"),
  sendValidationError: text("send_validation_error"),
  fiscalYear: integer("fiscal_year"),
  fiscalQuarter: integer("fiscal_quarter"),
  weekOfYear: integer("week_of_year").array(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const templates = pgTable("templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  maliciousPageContent: text("malicious_page_content").notNull(),
  autoInsertLandingEnabled: boolean("auto_insert_landing_enabled").notNull().default(true),
  autoInsertLandingLabel: text("auto_insert_landing_label").notNull().default("문서 확인하기"),
  autoInsertLandingKind: text("auto_insert_landing_kind").notNull().default("link"),
  autoInsertLandingNewTab: boolean("auto_insert_landing_new_tab").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const targets = pgTable("targets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  department: text("department"),
  tags: text("tags").array(),
  status: text("status").default("active"), // active, inactive
  createdAt: timestamp("created_at").defaultNow(),
});

export const trainingPages = pgTable("training_pages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  content: text("content").notNull(), // HTML content
  status: text("status").default("active"), // active, inactive
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const projectTargets = pgTable("project_targets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull(),
  targetId: varchar("target_id").notNull(),
  trackingToken: text("tracking_token").unique(),
  status: text("status").default("sent"), // sent, opened, clicked, submitted, no_response
  sendStatus: text("send_status").default("pending"), // pending, sent, failed
  sentAt: timestamp("sent_at"),
  sendError: text("send_error"),
  openedAt: timestamp("opened_at"),
  clickedAt: timestamp("clicked_at"),
  submittedAt: timestamp("submitted_at"),
});

export const sendJobs = pgTable("send_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull(),
  status: text("status").notNull(), // queued, running, done, failed
  createdAt: timestamp("created_at").defaultNow(),
  startedAt: timestamp("started_at"),
  finishedAt: timestamp("finished_at"),
  attempts: integer("attempts").default(0),
  lastError: text("last_error"),
  totalCount: integer("total_count").default(0),
  successCount: integer("success_count").default(0),
  failCount: integer("fail_count").default(0),
});

export const reportTemplates = pgTable("report_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  version: text("version").notNull(),
  fileKey: text("file_key").notNull(),
  isActive: boolean("is_active").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const reportInstances = pgTable("report_instances", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull(),
  templateId: varchar("template_id").notNull(),
  status: text("status").notNull(), // pending, completed, failed
  fileKey: text("file_key"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const authSessions = pgTable("auth_sessions", {
  sessionId: varchar("session_id").primaryKey(),
  sub: text("sub").notNull(),
  email: text("email"),
  name: text("name"),
  accessTokenExp: timestamp("access_token_exp"),
  refreshTokenEnc: text("refresh_token_enc"),
  idleExpiresAt: timestamp("idle_expires_at").notNull(),
  absoluteExpiresAt: timestamp("absolute_expires_at").notNull(),
  revokedAt: timestamp("revoked_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
  fiscalYear: true,
  fiscalQuarter: true,
  weekOfYear: true,
  sendValidationError: true,
});

export const insertTemplateSchema = createInsertSchema(templates)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    autoInsertLandingEnabled: z.boolean().default(true),
    autoInsertLandingLabel: z.string().trim().min(1, "링크 문구를 입력하세요.").default("문서 확인하기"),
    autoInsertLandingKind: z.enum(["link", "button"]).default("link"),
    autoInsertLandingNewTab: z.boolean().default(true),
  });

export const insertTargetSchema = createInsertSchema(targets).omit({
  id: true,
  createdAt: true,
});

export const insertTrainingPageSchema = createInsertSchema(trainingPages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProjectTargetSchema = createInsertSchema(projectTargets).omit({
  id: true,
});

export const insertSendJobSchema = createInsertSchema(sendJobs).omit({
  id: true,
  createdAt: true,
  startedAt: true,
  finishedAt: true,
});

export const insertReportTemplateSchema = createInsertSchema(reportTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertReportInstanceSchema = createInsertSchema(reportInstances).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

export const insertAuthSessionSchema = createInsertSchema(authSessions).omit({
  revokedAt: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;
export type InsertTemplate = z.infer<typeof insertTemplateSchema>;
export type Template = typeof templates.$inferSelect;
export type InsertTarget = z.infer<typeof insertTargetSchema>;
export type Target = typeof targets.$inferSelect;
export type InsertTrainingPage = z.infer<typeof insertTrainingPageSchema>;
export type TrainingPage = typeof trainingPages.$inferSelect;
export type InsertProjectTarget = z.infer<typeof insertProjectTargetSchema>;
export type ProjectTarget = typeof projectTargets.$inferSelect;
export type InsertReportTemplate = z.infer<typeof insertReportTemplateSchema>;
export type ReportTemplate = typeof reportTemplates.$inferSelect;
export type InsertReportInstance = z.infer<typeof insertReportInstanceSchema>;
export type ReportInstance = typeof reportInstances.$inferSelect;
export type InsertSendJob = z.infer<typeof insertSendJobSchema>;
export type SendJob = typeof sendJobs.$inferSelect;
export type InsertAuthSession = z.infer<typeof insertAuthSessionSchema>;
export type AuthSession = typeof authSessions.$inferSelect;
