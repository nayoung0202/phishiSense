import { storage } from "@/server/storage";
import { enqueueSendJobForProjectCore, type EnqueueSendJobResult } from "./sendJobsCore";
import {
  SendValidationError,
  formatSendValidationError,
  validateProjectForSend,
} from "./templateSendValidation";

export const enqueueSendJobForProject = async (
  projectId: string,
): Promise<EnqueueSendJobResult> => {
  const project = await storage.getProject(projectId);
  if (!project) {
    throw new Error("project_not_found");
  }
  const validation = await validateProjectForSend(storage, project);
  if (!validation.ok) {
    const message = formatSendValidationError(validation.issues);
    await storage.updateProject(project.id, { sendValidationError: message });
    throw new SendValidationError(validation.issues);
  }
  await storage.updateProject(project.id, { sendValidationError: null });
  return enqueueSendJobForProjectCore(storage, projectId);
};
