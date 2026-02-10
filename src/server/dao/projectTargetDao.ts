import { eq, inArray } from "drizzle-orm";
import type { ProjectTarget } from "@shared/schema";
import { db } from "../db";
import { projectTargets } from "../db/schema";

export async function listProjectTargets(projectId: string): Promise<ProjectTarget[]> {
  return db.select().from(projectTargets).where(eq(projectTargets.projectId, projectId));
}

export async function getProjectTargetByTrackingToken(
  trackingToken: string,
): Promise<ProjectTarget | undefined> {
  const rows = await db
    .select()
    .from(projectTargets)
    .where(eq(projectTargets.trackingToken, trackingToken))
    .limit(1);
  return rows[0];
}

export async function createProjectTargetRecord(
  payload: typeof projectTargets.$inferInsert,
): Promise<ProjectTarget> {
  const rows = await db.insert(projectTargets).values(payload).returning();
  const projectTarget = rows[0];
  if (!projectTarget) {
    throw new Error("프로젝트 대상자를 저장하지 못했습니다.");
  }
  return projectTarget;
}

export async function updateProjectTargetById(
  id: string,
  payload: Partial<typeof projectTargets.$inferInsert>,
): Promise<ProjectTarget | undefined> {
  const rows = await db
    .update(projectTargets)
    .set(payload)
    .where(eq(projectTargets.id, id))
    .returning();
  return rows[0];
}

export async function deleteProjectTargetsByIds(ids: string[]): Promise<number> {
  if (ids.length === 0) return 0;
  const deleted = await db
    .delete(projectTargets)
    .where(inArray(projectTargets.id, ids))
    .returning({ id: projectTargets.id });
  return deleted.length;
}
