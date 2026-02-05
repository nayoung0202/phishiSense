import { desc, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import type { InsertReportInstance, ReportInstance } from "@shared/schema";
import { db } from "../db";
import { reportInstances } from "../db/schema";

export async function listReportInstancesByProject(projectId: string): Promise<ReportInstance[]> {
  return db
    .select()
    .from(reportInstances)
    .where(eq(reportInstances.projectId, projectId))
    .orderBy(desc(reportInstances.createdAt));
}

export async function getReportInstanceById(id: string): Promise<ReportInstance | undefined> {
  const rows = await db.select().from(reportInstances).where(eq(reportInstances.id, id)).limit(1);
  return rows[0];
}

export async function createReportInstance(
  payload: InsertReportInstance,
): Promise<ReportInstance> {
  const now = new Date();
  const id = randomUUID();
  const rows = await db
    .insert(reportInstances)
    .values({
      id,
      projectId: payload.projectId,
      templateId: payload.templateId,
      status: payload.status,
      fileKey: payload.fileKey ?? null,
      errorMessage: payload.errorMessage ?? null,
      createdAt: now,
      completedAt: null,
    })
    .returning();
  const instance = rows[0];
  if (!instance) throw new Error("보고서 이력을 저장하지 못했습니다.");
  return instance;
}

export async function updateReportInstance(
  id: string,
  payload: Partial<InsertReportInstance> & { completedAt?: Date | null },
): Promise<ReportInstance | undefined> {
  const existing = await getReportInstanceById(id);
  if (!existing) return undefined;
  const rows = await db
    .update(reportInstances)
    .set({
      status: payload.status ?? existing.status,
      fileKey: payload.fileKey !== undefined ? payload.fileKey ?? null : existing.fileKey,
      errorMessage:
        payload.errorMessage !== undefined ? payload.errorMessage ?? null : existing.errorMessage,
      completedAt:
        payload.completedAt !== undefined ? payload.completedAt ?? null : existing.completedAt,
    })
    .where(eq(reportInstances.id, id))
    .returning();
  return rows[0];
}
