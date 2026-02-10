import { and, desc, eq, inArray } from "drizzle-orm";
import type { SendJob } from "@shared/schema";
import { db } from "../db";
import { sendJobs } from "../db/schema";

const activeStatuses = ["queued", "running"];

type ActiveStatus = (typeof activeStatuses)[number];

export async function findActiveSendJobByProjectId(
  projectId: string,
): Promise<SendJob | undefined> {
  const rows = await db
    .select()
    .from(sendJobs)
    .where(
      and(eq(sendJobs.projectId, projectId), inArray(sendJobs.status, [...activeStatuses])),
    )
    .orderBy(desc(sendJobs.createdAt))
    .limit(1);
  return rows[0];
}

export async function createSendJobRecord(
  payload: typeof sendJobs.$inferInsert,
): Promise<SendJob> {
  const rows = await db.insert(sendJobs).values(payload).returning();
  const job = rows[0];
  if (!job) {
    throw new Error("발송 작업을 생성하지 못했습니다.");
  }
  return job;
}

export async function getSendJobById(id: string): Promise<SendJob | undefined> {
  const rows = await db.select().from(sendJobs).where(eq(sendJobs.id, id)).limit(1);
  return rows[0];
}

export async function updateSendJobById(
  id: string,
  payload: Partial<typeof sendJobs.$inferInsert>,
): Promise<SendJob | undefined> {
  const rows = await db.update(sendJobs).set(payload).where(eq(sendJobs.id, id)).returning();
  return rows[0];
}

export const ACTIVE_SEND_JOB_STATUSES: ActiveStatus[] = [...activeStatuses];
