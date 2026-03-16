import { and, desc, eq } from "drizzle-orm";
import type { TrainingPage } from "@shared/schema";
import { db } from "../db";
import { trainingPages } from "../db/schema";

export async function listTrainingPages(): Promise<TrainingPage[]> {
  return db.select().from(trainingPages).orderBy(desc(trainingPages.updatedAt));
}

export async function listTrainingPagesForTenant(
  tenantId: string,
): Promise<TrainingPage[]> {
  return db
    .select()
    .from(trainingPages)
    .where(eq(trainingPages.tenantId, tenantId))
    .orderBy(desc(trainingPages.updatedAt));
}

export async function getTrainingPageById(id: string): Promise<TrainingPage | undefined> {
  const rows = await db
    .select()
    .from(trainingPages)
    .where(eq(trainingPages.id, id))
    .limit(1);
  return rows[0];
}

export async function getTrainingPageByIdForTenant(
  tenantId: string,
  id: string,
): Promise<TrainingPage | undefined> {
  const rows = await db
    .select()
    .from(trainingPages)
    .where(and(eq(trainingPages.tenantId, tenantId), eq(trainingPages.id, id)))
    .limit(1);
  return rows[0];
}

export async function createTrainingPageRecord(
  payload: typeof trainingPages.$inferInsert,
): Promise<TrainingPage> {
  const rows = await db.insert(trainingPages).values(payload).returning();
  const page = rows[0];
  if (!page) {
    throw new Error("훈련 안내 페이지를 저장하지 못했습니다.");
  }
  return page;
}

export async function updateTrainingPageById(
  id: string,
  payload: Partial<typeof trainingPages.$inferInsert>,
): Promise<TrainingPage | undefined> {
  const rows = await db
    .update(trainingPages)
    .set(payload)
    .where(eq(trainingPages.id, id))
    .returning();
  return rows[0];
}

export async function updateTrainingPageByIdForTenant(
  tenantId: string,
  id: string,
  payload: Partial<typeof trainingPages.$inferInsert>,
): Promise<TrainingPage | undefined> {
  const rows = await db
    .update(trainingPages)
    .set(payload)
    .where(and(eq(trainingPages.tenantId, tenantId), eq(trainingPages.id, id)))
    .returning();
  return rows[0];
}

export async function deleteTrainingPageById(id: string): Promise<boolean> {
  const rows = await db
    .delete(trainingPages)
    .where(eq(trainingPages.id, id))
    .returning({ id: trainingPages.id });
  return rows.length > 0;
}

export async function deleteTrainingPageByIdForTenant(
  tenantId: string,
  id: string,
): Promise<boolean> {
  const rows = await db
    .delete(trainingPages)
    .where(and(eq(trainingPages.tenantId, tenantId), eq(trainingPages.id, id)))
    .returning({ id: trainingPages.id });
  return rows.length > 0;
}
