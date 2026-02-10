import { storage } from "@/server/storage";
import { enqueueSendJobForProjectCore, type EnqueueSendJobResult } from "./sendJobsCore";

export const enqueueSendJobForProject = async (
  projectId: string,
): Promise<EnqueueSendJobResult> => {
  const project = await storage.getProject(projectId);
  if (!project) {
    throw new Error("project_not_found");
  }
  return enqueueSendJobForProjectCore(storage, projectId);
};
