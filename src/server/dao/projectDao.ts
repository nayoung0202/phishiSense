import { desc, eq, inArray } from "drizzle-orm";
import type { Project } from "@shared/schema";
import { db } from "../db";
import { projects } from "../db/schema";

export async function listProjects(): Promise<Project[]> {
  return db.select().from(projects).orderBy(desc(projects.createdAt));
}

export async function listProjectsByIds(ids: string[]): Promise<Project[]> {
  if (ids.length === 0) return [];
  return db.select().from(projects).where(inArray(projects.id, ids));
}

export async function getProjectById(id: string): Promise<Project | undefined> {
  const rows = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  return rows[0];
}

export async function getProjectByTrainingLinkToken(
  token: string,
): Promise<Project | undefined> {
  const rows = await db
    .select()
    .from(projects)
    .where(eq(projects.trainingLinkToken, token))
    .limit(1);
  return rows[0];
}

export async function createProjectRecord(
  payload: typeof projects.$inferInsert,
): Promise<Project> {
  const rows = await db.insert(projects).values(payload).returning();
  const project = rows[0];
  if (!project) {
    throw new Error("프로젝트를 저장하지 못했습니다.");
  }
  return project;
}

export async function updateProjectById(
  id: string,
  payload: Partial<typeof projects.$inferInsert>,
): Promise<Project | undefined> {
  const rows = await db.update(projects).set(payload).where(eq(projects.id, id)).returning();
  return rows[0];
}

export async function deleteProjectById(id: string): Promise<boolean> {
  const rows = await db
    .delete(projects)
    .where(eq(projects.id, id))
    .returning({ id: projects.id });
  return rows.length > 0;
}
