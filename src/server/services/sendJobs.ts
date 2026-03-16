import type { EnqueueSendJobResult } from "./sendJobsCore";
import {
  SendValidationError,
  formatSendValidationError,
} from "./templateSendValidation";
import {
  enqueueSendJobForProjectForTenant,
  getProjectForTenant,
  updateProjectForTenant,
  validateProjectForSendForTenant,
} from "@/server/tenant/tenantStorage";

export const enqueueSendJobForProject = async (
  tenantId: string,
  projectId: string,
): Promise<EnqueueSendJobResult> => {
  const project = await getProjectForTenant(tenantId, projectId);
  if (!project) {
    throw new Error("project_not_found");
  }
  const validation = await validateProjectForSendForTenant(tenantId, project);
  if (!validation.ok) {
    const message = formatSendValidationError(validation.issues);
    await updateProjectForTenant(tenantId, project.id, { sendValidationError: message });
    throw new SendValidationError(validation.issues);
  }
  await updateProjectForTenant(tenantId, project.id, { sendValidationError: null });
  return enqueueSendJobForProjectForTenant(tenantId, projectId);
};
