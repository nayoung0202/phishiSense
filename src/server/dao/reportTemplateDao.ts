import { and, desc, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import type { InsertReportTemplate, ReportTemplate } from "@shared/schema";
import { db } from "../db";
import { reportTemplates } from "../db/schema";

export async function listReportTemplates(): Promise<ReportTemplate[]> {
  return db.select().from(reportTemplates).orderBy(desc(reportTemplates.createdAt));
}

export async function listReportTemplatesForTenant(
  tenantId: string,
): Promise<ReportTemplate[]> {
  return db
    .select()
    .from(reportTemplates)
    .where(eq(reportTemplates.tenantId, tenantId))
    .orderBy(desc(reportTemplates.createdAt));
}

export async function getReportTemplateById(id: string): Promise<ReportTemplate | undefined> {
  const rows = await db.select().from(reportTemplates).where(eq(reportTemplates.id, id)).limit(1);
  return rows[0];
}

export async function getReportTemplateByIdForTenant(
  tenantId: string,
  id: string,
): Promise<ReportTemplate | undefined> {
  const rows = await db
    .select()
    .from(reportTemplates)
    .where(and(eq(reportTemplates.tenantId, tenantId), eq(reportTemplates.id, id)))
    .limit(1);
  return rows[0];
}

export async function getActiveReportTemplate(): Promise<ReportTemplate | undefined> {
  const rows = await db
    .select()
    .from(reportTemplates)
    .where(eq(reportTemplates.isActive, true))
    .limit(1);
  return rows[0];
}

export async function getActiveReportTemplateForTenant(
  tenantId: string,
): Promise<ReportTemplate | undefined> {
  const rows = await db
    .select()
    .from(reportTemplates)
    .where(and(eq(reportTemplates.tenantId, tenantId), eq(reportTemplates.isActive, true)))
    .limit(1);
  return rows[0];
}

export async function createReportTemplate(
  payload: typeof reportTemplates.$inferInsert,
  options?: { activate?: boolean; id?: string },
): Promise<ReportTemplate> {
  const now = new Date();
  const id = options?.id ?? randomUUID();
  if (options?.activate) {
    await db
      .update(reportTemplates)
      .set({ isActive: false })
      .where(eq(reportTemplates.tenantId, payload.tenantId));
  }
  const rows = await db
    .insert(reportTemplates)
    .values({
      id,
      tenantId: payload.tenantId,
      name: payload.name,
      version: payload.version,
      fileKey: payload.fileKey,
      isActive: options?.activate ?? false,
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  const template = rows[0];
  if (!template) throw new Error("보고서 템플릿을 저장하지 못했습니다.");
  return template;
}

export async function setActiveReportTemplate(id: string): Promise<ReportTemplate | undefined> {
  const existing = await getReportTemplateById(id);
  if (!existing) return undefined;
  const now = new Date();
  await db
    .update(reportTemplates)
    .set({ isActive: false })
    .where(eq(reportTemplates.tenantId, existing.tenantId));
  const rows = await db
    .update(reportTemplates)
    .set({ isActive: true, updatedAt: now })
    .where(eq(reportTemplates.id, id))
    .returning();
  return rows[0];
}

export async function setActiveReportTemplateForTenant(
  tenantId: string,
  id: string,
): Promise<ReportTemplate | undefined> {
  const existing = await getReportTemplateByIdForTenant(tenantId, id);
  if (!existing) return undefined;
  const now = new Date();
  await db
    .update(reportTemplates)
    .set({ isActive: false })
    .where(eq(reportTemplates.tenantId, tenantId));
  const rows = await db
    .update(reportTemplates)
    .set({ isActive: true, updatedAt: now })
    .where(and(eq(reportTemplates.tenantId, tenantId), eq(reportTemplates.id, id)))
    .returning();
  return rows[0];
}
