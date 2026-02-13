import { randomUUID } from "node:crypto";
import type { InsertProjectTarget, InsertSendJob, ProjectTarget, SendJob } from "@shared/schema";
import { kickSendJobProcessor } from "./sendJobRunner";

type SendJobStorage = {
  findActiveSendJobByProjectId(projectId: string): Promise<SendJob | undefined>;
  getProjectTargets(projectId: string): Promise<ProjectTarget[]>;
  updateProjectTarget(
    id: string,
    projectTarget: Partial<InsertProjectTarget>,
  ): Promise<ProjectTarget | undefined>;
  createSendJob(job: InsertSendJob): Promise<SendJob>;
};

export type EnqueueSendJobResult = {
  job: SendJob;
  created: boolean;
};

export const enqueueSendJobForProjectCore = async (
  storage: SendJobStorage,
  projectId: string,
): Promise<EnqueueSendJobResult> => {
  const existingJob = await storage.findActiveSendJobByProjectId(projectId);
  if (existingJob) {
    return { job: existingJob, created: false };
  }

  const projectTargets = await storage.getProjectTargets(projectId);
  const eligibleTargets = projectTargets.filter((target) => target.status !== "test");

  const missingTokens = eligibleTargets.filter((target) => !target.trackingToken);
  if (missingTokens.length > 0) {
    await Promise.all(
      missingTokens.map((target) =>
        storage.updateProjectTarget(target.id, { trackingToken: randomUUID() }),
      ),
    );
  }

  const totalCount = eligibleTargets.filter(
    (target) => (target.sendStatus ?? "pending") !== "sent",
  ).length;

  const job = await storage.createSendJob({
    projectId,
    status: "queued",
    totalCount,
    successCount: 0,
    failCount: 0,
    attempts: 0,
  });
  kickSendJobProcessor();

  return { job, created: true };
};
