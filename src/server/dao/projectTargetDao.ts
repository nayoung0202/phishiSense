import { eq } from "drizzle-orm";
import type { ProjectTarget } from "@shared/schema";
import { db } from "../db";
import { projectTargets } from "../db/schema";

export async function listProjectTargets(projectId: string): Promise<ProjectTarget[]> {
  return db.select().from(projectTargets).where(eq(projectTargets.projectId, projectId));
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
