import { desc, eq, ilike } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import type { InsertTarget, Target } from "@shared/schema";
import { db } from "../db";
import { targets } from "../db/schema";

export async function listTargets(): Promise<Target[]> {
  return db.select().from(targets).orderBy(desc(targets.createdAt));
}

export async function hasTargets(): Promise<boolean> {
  const rows = await db.select({ id: targets.id }).from(targets).limit(1);
  return rows.length > 0;
}

export async function getTargetById(id: string): Promise<Target | undefined> {
  const rows = await db.select().from(targets).where(eq(targets.id, id)).limit(1);
  return rows[0];
}

export async function findTargetByEmail(email: string): Promise<Target | undefined> {
  const normalized = email.trim();
  if (!normalized) return undefined;
  const rows = await db
    .select()
    .from(targets)
    .where(ilike(targets.email, normalized))
    .limit(1);
  return rows[0];
}

export async function createTarget(payload: InsertTarget): Promise<Target> {
  const id = randomUUID();
  const now = new Date();
  const rows = await db
    .insert(targets)
    .values({
      id,
      name: payload.name,
      email: payload.email,
      department: payload.department ?? null,
      tags: payload.tags ?? null,
      status: payload.status ?? "active",
      createdAt: now,
    })
    .returning();
  const target = rows[0];
  if (!target) {
    throw new Error("대상을 저장하지 못했습니다.");
  }
  return target;
}

export async function updateTargetById(
  id: string,
  payload: Partial<InsertTarget>,
): Promise<Target | undefined> {
  const existing = await getTargetById(id);
  if (!existing) return undefined;
  const rows = await db
    .update(targets)
    .set({
      name: payload.name ?? existing.name,
      email: payload.email ?? existing.email,
      department:
        payload.department !== undefined ? payload.department ?? null : existing.department ?? null,
      tags: payload.tags !== undefined ? payload.tags ?? null : existing.tags ?? null,
      status: payload.status ?? existing.status ?? "active",
    })
    .where(eq(targets.id, id))
    .returning();
  return rows[0];
}

export async function deleteTargetById(id: string): Promise<boolean> {
  const rows = await db
    .delete(targets)
    .where(eq(targets.id, id))
    .returning({ id: targets.id });
  return rows.length > 0;
}
