import { randomUUID } from "node:crypto";
import { eachDayOfInterval, getISOWeek } from "date-fns";
import type {
  InsertProject,
  InsertProjectTarget,
  InsertReportInstance,
  InsertReportSetting,
  InsertReportTemplate,
  InsertSendJob,
  InsertTarget,
  InsertTemplate,
  InsertTrainingPage,
  Project,
  ProjectTarget,
  ReportInstance,
  ReportSetting,
  ReportTemplate,
  SendJob,
  Target,
  Template,
  TrainingPage,
} from "@shared/schema";
import { generateTrainingLinkToken } from "@/server/lib/trainingLink";
import { normalizePlainText } from "@/server/lib/validation/text";
import {
  createProjectRecord,
  deleteProjectByIdForTenant,
  getProjectByIdForTenant,
  getProjectByTrainingLinkToken,
  listProjectsByIdsForTenant,
  listProjectsForTenant,
  updateProjectByIdForTenant,
} from "@/server/dao/projectDao";
import {
  createTemplate as createTemplateRecord,
  deleteTemplateByIdForTenant,
  getTemplateByIdForTenant,
  listTemplatesForTenant,
  updateTemplateByIdForTenant,
} from "@/server/dao/templateDao";
import {
  createTarget as createTargetRecord,
  deleteTargetByIdForTenant,
  findTargetByEmailForTenant,
  getTargetByIdForTenant,
  listTargetsForTenant,
  updateTargetByIdForTenant,
} from "@/server/dao/targetDao";
import {
  createTrainingPageRecord,
  deleteTrainingPageByIdForTenant,
  getTrainingPageByIdForTenant,
  listTrainingPagesForTenant,
  updateTrainingPageByIdForTenant,
} from "@/server/dao/trainingPageDao";
import {
  createProjectTargetRecord,
  deleteProjectTargetsByIdsForTenant,
  getProjectTargetByTrackingToken,
  listProjectTargetsForTenant,
  updateProjectTargetByIdForTenant,
} from "@/server/dao/projectTargetDao";
import {
  createSendJobRecord,
  findActiveSendJobByProjectIdForTenant,
  getSendJobByIdForTenant,
  updateSendJobByIdForTenant,
} from "@/server/dao/sendJobDao";
import {
  createReportTemplate as createReportTemplateRecord,
  getActiveReportTemplateForTenant,
  getReportTemplateByIdForTenant,
  listReportTemplatesForTenant,
  setActiveReportTemplateForTenant,
} from "@/server/dao/reportTemplateDao";
import {
  countReportSettingsForTenant,
  createReportSetting as createReportSettingRecord,
  getDefaultReportSettingForTenant,
  getReportSettingByIdForTenant,
  listReportSettingsForTenant,
  setDefaultReportSettingForTenant,
  updateReportSettingForTenant,
} from "@/server/dao/reportSettingDao";
import {
  createReportInstance as createReportInstanceRecord,
  getReportInstanceByIdForTenant,
  listReportInstancesByProjectForTenant,
  updateReportInstanceForTenant,
} from "@/server/dao/reportInstanceDao";
import { shouldCompleteProject, shouldStartScheduledProject } from "@/server/services/projectsShared";
import { enqueueSendJobForProjectCore } from "@/server/services/sendJobsCore";
import {
  formatSendValidationError,
  validateProjectForSend,
  type SendValidationResult,
} from "@/server/services/templateSendValidation";
import { sanitizeHtml } from "@/server/utils/sanitizeHtml";

type ProjectUpdate = Partial<InsertProject> & {
  sendValidationError?: string | null;
};

export type TenantReportSettingsPage = {
  items: ReportSetting[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type PublicProjectContext = {
  tenantId: string;
  projectTarget: ProjectTarget;
  project: Project;
};

export type PublicPhishingContext = PublicProjectContext & {
  template: Template;
  trainingPage: TrainingPage;
};

export type PublicTrainingContext = PublicProjectContext & {
  trainingPage: TrainingPage;
};

const DEFAULT_DEV_TENANT_ID = process.env.DEV_TENANT_ID ?? "tenant-local-001";

const parseDate = (value: unknown, fallback?: Date) => {
  if (value instanceof Date) {
    return new Date(value);
  }
  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }
  if (fallback) {
    return new Date(fallback);
  }
  const now = new Date();
  now.setMilliseconds(0);
  return now;
};

const calculateTemporalFields = (startDate: Date, endDate: Date) => {
  const safeStart = startDate <= endDate ? startDate : endDate;
  const safeEnd = endDate >= startDate ? endDate : startDate;
  const fiscalYear = safeStart.getFullYear();
  const fiscalQuarter = Math.floor(safeStart.getMonth() / 3) + 1;
  const days = eachDayOfInterval({ start: safeStart, end: safeEnd });
  const weekSet = new Set<number>();
  days.forEach((day) => {
    weekSet.add(getISOWeek(day));
  });

  return {
    fiscalYear,
    fiscalQuarter,
    weekOfYear: Array.from(weekSet).sort((a, b) => a - b),
  };
};

const buildValidationStorage = (tenantId: string) => ({
  getTemplate(id: string) {
    return getTemplateByIdForTenant(tenantId, id);
  },
  getTrainingPage(id: string) {
    return getTrainingPageByIdForTenant(tenantId, id);
  },
});

async function assertUniqueTrainingLinkToken(
  token: string,
  projectId?: string,
) {
  const existing = await getProjectByTrainingLinkToken(token);
  if (existing && existing.id !== projectId) {
    throw new Error("이미 사용 중인 훈련 링크 토큰입니다.");
  }
}

async function resolveTrainingLinkToken(
  requested?: string | null,
  projectId?: string,
) {
  const normalized = (requested ?? "").trim();
  if (normalized) {
    await assertUniqueTrainingLinkToken(normalized, projectId);
    return normalized;
  }

  let token = generateTrainingLinkToken();
  while (await getProjectByTrainingLinkToken(token)) {
    token = generateTrainingLinkToken();
  }
  return token;
}

export async function validateProjectForSendForTenant(
  tenantId: string,
  project: Project,
): Promise<SendValidationResult> {
  return validateProjectForSend(buildValidationStorage(tenantId), project);
}

export async function enqueueSendJobForProjectForTenant(
  tenantId: string,
  projectId: string,
) {
  return enqueueSendJobForProjectCore(
    {
      findActiveSendJobByProjectId(id) {
        return findActiveSendJobByProjectIdForTenant(tenantId, id);
      },
      getProjectTargets(id) {
        return listProjectTargetsForTenant(tenantId, id);
      },
      updateProjectTarget(id, projectTarget) {
        return updateProjectTargetByIdForTenant(tenantId, id, projectTarget);
      },
      createSendJob(job) {
        return createSendJobRecord({
          ...job,
          tenantId,
        });
      },
    },
    projectId,
  );
}

async function syncProjectStateForTenant(
  tenantId: string,
  project: Project,
): Promise<Project> {
  const now = new Date();
  if (shouldCompleteProject(project, now)) {
    const updated = await updateProjectByIdForTenant(tenantId, project.id, {
      status: "완료",
    });
    return updated ?? { ...project, status: "완료" };
  }

  if (!shouldStartScheduledProject(project, now)) {
    return project;
  }

  const validation = await validateProjectForSendForTenant(tenantId, project);
  if (!validation.ok) {
    const message = formatSendValidationError(validation.issues);
    const updated = await updateProjectByIdForTenant(tenantId, project.id, {
      status: "예약",
      sendValidationError: message,
    });
    return updated ?? { ...project, status: "예약", sendValidationError: message };
  }

  const updated = await updateProjectByIdForTenant(tenantId, project.id, {
    status: "진행중",
    sendValidationError: null,
  });
  await enqueueSendJobForProjectForTenant(tenantId, project.id);
  return updated ?? { ...project, status: "진행중", sendValidationError: null };
}

export async function getProjectsForTenant(tenantId: string): Promise<Project[]> {
  const projects = await listProjectsForTenant(tenantId);
  return Promise.all(projects.map((project) => syncProjectStateForTenant(tenantId, project)));
}

export async function getProjectForTenant(
  tenantId: string,
  id: string,
): Promise<Project | undefined> {
  const project = await getProjectByIdForTenant(tenantId, id);
  if (!project) return undefined;
  return syncProjectStateForTenant(tenantId, project);
}

export async function createProjectForTenant(
  tenantId: string,
  project: InsertProject,
): Promise<Project> {
  const id = randomUUID();
  const startDate = parseDate(project.startDate);
  const endDate = parseDate(project.endDate, startDate);
  const temporal = calculateTemporalFields(startDate, endDate);
  const trainingLinkToken = await resolveTrainingLinkToken(project.trainingLinkToken);

  return createProjectRecord({
    id,
    tenantId,
    name: normalizePlainText(project.name, 200),
    description: project.description ? normalizePlainText(project.description, 2000) : null,
    department: project.department ? normalizePlainText(project.department, 200) : null,
    departmentTags: Array.isArray(project.departmentTags)
      ? project.departmentTags
          .map((tag) => normalizePlainText(tag, 120))
          .filter((tag) => tag.length > 0)
      : [],
    templateId: project.templateId ?? null,
    trainingPageId: project.trainingPageId ?? null,
    trainingLinkToken,
    sendingDomain: project.sendingDomain ? normalizePlainText(project.sendingDomain, 200) : null,
    fromName: project.fromName ? normalizePlainText(project.fromName, 200) : null,
    fromEmail: project.fromEmail ?? null,
    timezone: project.timezone ? normalizePlainText(project.timezone, 64) : "Asia/Seoul",
    notificationEmails: Array.isArray(project.notificationEmails)
      ? project.notificationEmails.map((email) => email.trim())
      : [],
    startDate,
    endDate,
    status: project.status,
    targetCount: project.targetCount ?? null,
    openCount: project.openCount ?? null,
    clickCount: project.clickCount ?? null,
    submitCount: project.submitCount ?? null,
    reportCaptureInboxFileKey: project.reportCaptureInboxFileKey ?? null,
    reportCaptureEmailFileKey: project.reportCaptureEmailFileKey ?? null,
    reportCaptureMaliciousFileKey: project.reportCaptureMaliciousFileKey ?? null,
    reportCaptureTrainingFileKey: project.reportCaptureTrainingFileKey ?? null,
    sendValidationError: null,
    fiscalYear: temporal.fiscalYear,
    fiscalQuarter: temporal.fiscalQuarter,
    weekOfYear: temporal.weekOfYear,
    createdAt: new Date(),
  });
}

export async function updateProjectForTenant(
  tenantId: string,
  id: string,
  project: ProjectUpdate,
): Promise<Project | undefined> {
  const existing = await getProjectByIdForTenant(tenantId, id);
  if (!existing) return undefined;
  const updatedStart = project.startDate
    ? parseDate(project.startDate)
    : new Date(existing.startDate);
  const updatedEnd = project.endDate
    ? parseDate(project.endDate, updatedStart)
    : new Date(existing.endDate);
  const temporal = calculateTemporalFields(updatedStart, updatedEnd);

  const requestedTokenRaw =
    typeof project.trainingLinkToken === "string" ? project.trainingLinkToken.trim() : null;
  const requestedToken = requestedTokenRaw && requestedTokenRaw.length > 0 ? requestedTokenRaw : null;
  if (requestedToken && requestedToken !== existing.trainingLinkToken) {
    await assertUniqueTrainingLinkToken(requestedToken, id);
  }

  const nextProject: Project = {
    ...existing,
    ...project,
    name:
      typeof project.name === "string"
        ? normalizePlainText(project.name, 200)
        : existing.name,
    description:
      typeof project.description === "string"
        ? normalizePlainText(project.description, 2000)
        : existing.description ?? null,
    department:
      typeof project.department === "string"
        ? normalizePlainText(project.department, 200)
        : existing.department ?? null,
    templateId:
      project.templateId !== undefined ? project.templateId ?? null : existing.templateId ?? null,
    trainingPageId:
      project.trainingPageId !== undefined
        ? project.trainingPageId ?? null
        : existing.trainingPageId ?? null,
    trainingLinkToken: requestedToken ?? existing.trainingLinkToken ?? null,
    startDate: updatedStart,
    endDate: updatedEnd,
    departmentTags: Array.isArray(project.departmentTags)
      ? project.departmentTags
          .map((tag) => normalizePlainText(tag, 120))
          .filter((tag) => tag.length > 0)
      : existing.departmentTags ?? [],
    sendingDomain:
      typeof project.sendingDomain === "string"
        ? normalizePlainText(project.sendingDomain, 200)
        : existing.sendingDomain ?? null,
    fromName:
      typeof project.fromName === "string"
        ? normalizePlainText(project.fromName, 200)
        : existing.fromName ?? null,
    fromEmail: project.fromEmail ?? existing.fromEmail ?? null,
    timezone:
      typeof project.timezone === "string"
        ? normalizePlainText(project.timezone, 64)
        : existing.timezone ?? "Asia/Seoul",
    notificationEmails: Array.isArray(project.notificationEmails)
      ? project.notificationEmails.map((email) => email.trim())
      : existing.notificationEmails ?? [],
    status: project.status ?? existing.status,
    targetCount:
      project.targetCount !== undefined ? project.targetCount ?? null : existing.targetCount ?? null,
    openCount:
      project.openCount !== undefined ? project.openCount ?? null : existing.openCount ?? null,
    clickCount:
      project.clickCount !== undefined ? project.clickCount ?? null : existing.clickCount ?? null,
    submitCount:
      project.submitCount !== undefined ? project.submitCount ?? null : existing.submitCount ?? null,
    reportCaptureInboxFileKey:
      project.reportCaptureInboxFileKey !== undefined
        ? project.reportCaptureInboxFileKey ?? null
        : existing.reportCaptureInboxFileKey ?? null,
    reportCaptureEmailFileKey:
      project.reportCaptureEmailFileKey !== undefined
        ? project.reportCaptureEmailFileKey ?? null
        : existing.reportCaptureEmailFileKey ?? null,
    reportCaptureMaliciousFileKey:
      project.reportCaptureMaliciousFileKey !== undefined
        ? project.reportCaptureMaliciousFileKey ?? null
        : existing.reportCaptureMaliciousFileKey ?? null,
    reportCaptureTrainingFileKey:
      project.reportCaptureTrainingFileKey !== undefined
        ? project.reportCaptureTrainingFileKey ?? null
        : existing.reportCaptureTrainingFileKey ?? null,
    sendValidationError:
      project.sendValidationError !== undefined
        ? project.sendValidationError ?? null
        : existing.sendValidationError ?? null,
    fiscalYear: temporal.fiscalYear,
    fiscalQuarter: temporal.fiscalQuarter,
    weekOfYear: temporal.weekOfYear,
    createdAt: existing.createdAt,
  };

  return (
    (await updateProjectByIdForTenant(tenantId, id, {
      name: nextProject.name,
      description: nextProject.description,
      department: nextProject.department,
      departmentTags: nextProject.departmentTags ?? [],
      templateId: nextProject.templateId ?? null,
      trainingPageId: nextProject.trainingPageId ?? null,
      trainingLinkToken: nextProject.trainingLinkToken ?? null,
      sendingDomain: nextProject.sendingDomain ?? null,
      fromName: nextProject.fromName ?? null,
      fromEmail: nextProject.fromEmail ?? null,
      timezone: nextProject.timezone ?? null,
      notificationEmails: nextProject.notificationEmails ?? [],
      startDate: nextProject.startDate,
      endDate: nextProject.endDate,
      status: nextProject.status,
      targetCount: nextProject.targetCount ?? null,
      openCount: nextProject.openCount ?? null,
      clickCount: nextProject.clickCount ?? null,
      submitCount: nextProject.submitCount ?? null,
      reportCaptureInboxFileKey: nextProject.reportCaptureInboxFileKey ?? null,
      reportCaptureEmailFileKey: nextProject.reportCaptureEmailFileKey ?? null,
      reportCaptureMaliciousFileKey: nextProject.reportCaptureMaliciousFileKey ?? null,
      reportCaptureTrainingFileKey: nextProject.reportCaptureTrainingFileKey ?? null,
      sendValidationError: nextProject.sendValidationError ?? null,
      fiscalYear: nextProject.fiscalYear ?? null,
      fiscalQuarter: nextProject.fiscalQuarter ?? null,
      weekOfYear: nextProject.weekOfYear ?? [],
    })) ?? nextProject
  );
}

export async function deleteProjectForTenant(tenantId: string, id: string) {
  return deleteProjectByIdForTenant(tenantId, id);
}

export async function copyProjectsForTenant(
  tenantId: string,
  ids: string[],
): Promise<Project[]> {
  const copies: Project[] = [];
  const [allProjects, selectedProjects] = await Promise.all([
    listProjectsForTenant(tenantId),
    listProjectsByIdsForTenant(tenantId, ids),
  ]);
  const projectMap = new Map(selectedProjects.map((project) => [project.id, project]));
  const existingNames = new Set(allProjects.map((project) => project.name));

  const generateCopyName = (original: string) => {
    const baseName = `${original} 복제`;
    if (!existingNames.has(baseName)) {
      existingNames.add(baseName);
      return baseName;
    }
    let index = 2;
    let candidate = `${baseName} ${index}`;
    while (existingNames.has(candidate)) {
      index += 1;
      candidate = `${baseName} ${index}`;
    }
    existingNames.add(candidate);
    return candidate;
  };

  for (const id of ids) {
    const project = projectMap.get(id);
    if (!project) continue;

    const startDate = new Date(project.startDate);
    const endDate = new Date(project.endDate);
    const temporal = calculateTemporalFields(startDate, endDate);
    const trainingLinkToken = await resolveTrainingLinkToken();
    const created = await createProjectRecord({
      id: randomUUID(),
      tenantId,
      name: generateCopyName(project.name),
      description: project.description ?? null,
      department: project.department ?? null,
      departmentTags: project.departmentTags ?? [],
      templateId: project.templateId ?? null,
      trainingPageId: project.trainingPageId ?? null,
      trainingLinkToken,
      sendingDomain: project.sendingDomain ?? null,
      fromName: project.fromName ?? null,
      fromEmail: project.fromEmail ?? null,
      timezone: project.timezone ?? "Asia/Seoul",
      notificationEmails: project.notificationEmails ?? [],
      startDate,
      endDate,
      status: project.status,
      targetCount: project.targetCount ?? null,
      openCount: project.openCount ?? null,
      clickCount: project.clickCount ?? null,
      submitCount: project.submitCount ?? null,
      reportCaptureInboxFileKey: null,
      reportCaptureEmailFileKey: null,
      reportCaptureMaliciousFileKey: null,
      reportCaptureTrainingFileKey: null,
      sendValidationError: project.sendValidationError ?? null,
      fiscalYear: temporal.fiscalYear,
      fiscalQuarter: temporal.fiscalQuarter,
      weekOfYear: temporal.weekOfYear,
      createdAt: new Date(),
    });
    const originalTargets = await listProjectTargetsForTenant(tenantId, project.id);
    if (originalTargets.length > 0) {
      await Promise.all(
        originalTargets.map((target) =>
          createProjectTargetRecord({
            id: randomUUID(),
            tenantId,
            projectId: created.id,
            targetId: target.targetId,
            trackingToken: randomUUID(),
            status: "sent",
            sendStatus: "pending",
            sentAt: null,
            sendError: null,
            openedAt: null,
            clickedAt: null,
            submittedAt: null,
          }),
        ),
      );
    }
    copies.push(created);
  }

  return copies;
}

export async function getTemplatesForTenant(tenantId: string) {
  return listTemplatesForTenant(tenantId);
}

export async function getTemplateForTenant(tenantId: string, id: string) {
  return getTemplateByIdForTenant(tenantId, id);
}

export async function createTemplateForTenant(
  tenantId: string,
  template: InsertTemplate,
) {
  const autoInsertLandingKind =
    template.autoInsertLandingKind === "button" ? "button" : "link";
  return createTemplateRecord({
    tenantId,
    name: template.name,
    subject: template.subject,
    body: sanitizeHtml(template.body ?? ""),
    maliciousPageContent: sanitizeHtml(template.maliciousPageContent ?? ""),
    autoInsertLandingEnabled: template.autoInsertLandingEnabled ?? true,
    autoInsertLandingLabel: (template.autoInsertLandingLabel ?? "문서 확인하기").trim(),
    autoInsertLandingKind,
    autoInsertLandingNewTab: template.autoInsertLandingNewTab ?? true,
  });
}

export async function updateTemplateForTenant(
  tenantId: string,
  id: string,
  template: Partial<InsertTemplate>,
) {
  const sanitizedPayload: Partial<InsertTemplate> = { ...template };
  if (typeof template.body === "string") {
    sanitizedPayload.body = sanitizeHtml(template.body);
  }
  if (template.maliciousPageContent !== undefined) {
    sanitizedPayload.maliciousPageContent = sanitizeHtml(template.maliciousPageContent ?? "");
  }
  if (template.autoInsertLandingLabel !== undefined) {
    sanitizedPayload.autoInsertLandingLabel = template.autoInsertLandingLabel.trim();
  }
  if (template.autoInsertLandingKind !== undefined) {
    sanitizedPayload.autoInsertLandingKind =
      template.autoInsertLandingKind === "button" ? "button" : "link";
  }
  return updateTemplateByIdForTenant(tenantId, id, sanitizedPayload);
}

export async function deleteTemplateForTenant(tenantId: string, id: string) {
  return deleteTemplateByIdForTenant(tenantId, id);
}

export async function getTargetsForTenant(tenantId: string) {
  return listTargetsForTenant(tenantId);
}

export async function getTargetForTenant(tenantId: string, id: string) {
  return getTargetByIdForTenant(tenantId, id);
}

export async function findTargetByEmailInTenant(tenantId: string, email: string) {
  return findTargetByEmailForTenant(tenantId, email);
}

export async function createTargetForTenant(
  tenantId: string,
  target: InsertTarget,
) {
  return createTargetRecord({
    tenantId,
    name: normalizePlainText(target.name, 200),
    email: target.email,
    department: target.department ? normalizePlainText(target.department, 200) : null,
    tags: target.tags
      ? target.tags
          .map((tag) => normalizePlainText(tag, 120))
          .filter((tag) => tag.length > 0)
      : null,
    status: target.status ?? "active",
  });
}

export async function updateTargetForTenant(
  tenantId: string,
  id: string,
  target: Partial<InsertTarget>,
) {
  const existing = await getTargetByIdForTenant(tenantId, id);
  if (!existing) return undefined;
  return updateTargetByIdForTenant(tenantId, id, {
    ...target,
    name:
      typeof target.name === "string"
        ? normalizePlainText(target.name, 200)
        : existing.name,
    department:
      typeof target.department === "string"
        ? normalizePlainText(target.department, 200)
        : existing.department ?? null,
    tags: Array.isArray(target.tags)
      ? target.tags
          .map((tag) => normalizePlainText(tag, 120))
          .filter((tag) => tag.length > 0)
      : existing.tags ?? null,
    status:
      typeof target.status === "string" ? target.status : existing.status ?? "active",
  });
}

export async function deleteTargetForTenant(tenantId: string, id: string) {
  return deleteTargetByIdForTenant(tenantId, id);
}

export async function getTrainingPagesForTenant(tenantId: string) {
  return listTrainingPagesForTenant(tenantId);
}

export async function getTrainingPageForTenant(tenantId: string, id: string) {
  return getTrainingPageByIdForTenant(tenantId, id);
}

export async function createTrainingPageForTenant(
  tenantId: string,
  page: InsertTrainingPage,
) {
  const now = new Date();
  return createTrainingPageRecord({
    id: randomUUID(),
    tenantId,
    name: normalizePlainText(page.name, 200),
    description: page.description ? normalizePlainText(page.description, 1000) : null,
    content: sanitizeHtml(page.content ?? ""),
    status: page.status ?? null,
    createdAt: now,
    updatedAt: now,
  });
}

export async function updateTrainingPageForTenant(
  tenantId: string,
  id: string,
  page: Partial<InsertTrainingPage>,
) {
  const existing = await getTrainingPageByIdForTenant(tenantId, id);
  if (!existing) return undefined;
  return updateTrainingPageByIdForTenant(tenantId, id, {
    name:
      typeof page.name === "string" ? normalizePlainText(page.name, 200) : existing.name,
    description:
      typeof page.description === "string"
        ? normalizePlainText(page.description, 1000)
        : existing.description ?? null,
    content:
      typeof page.content === "string" ? sanitizeHtml(page.content) : existing.content,
    status: page.status ?? existing.status ?? null,
    updatedAt: new Date(),
  });
}

export async function deleteTrainingPageForTenant(tenantId: string, id: string) {
  return deleteTrainingPageByIdForTenant(tenantId, id);
}

export async function getProjectTargetsForTenant(tenantId: string, projectId: string) {
  return listProjectTargetsForTenant(tenantId, projectId);
}

export async function createProjectTargetForTenant(
  tenantId: string,
  projectTarget: InsertProjectTarget,
) {
  return createProjectTargetRecord({
    id: randomUUID(),
    tenantId,
    projectId: projectTarget.projectId,
    targetId: projectTarget.targetId,
    trackingToken: projectTarget.trackingToken ?? randomUUID(),
    status: projectTarget.status ?? null,
    sendStatus: projectTarget.sendStatus ?? "pending",
    sentAt: projectTarget.sentAt ?? null,
    sendError: projectTarget.sendError ?? null,
    openedAt: projectTarget.openedAt ?? null,
    clickedAt: projectTarget.clickedAt ?? null,
    submittedAt: projectTarget.submittedAt ?? null,
  });
}

export async function updateProjectTargetForTenant(
  tenantId: string,
  id: string,
  projectTarget: Partial<InsertProjectTarget>,
) {
  return updateProjectTargetByIdForTenant(tenantId, id, projectTarget);
}

export async function deleteProjectTargetsForTenant(
  tenantId: string,
  ids: string[],
) {
  return deleteProjectTargetsByIdsForTenant(tenantId, ids);
}

export async function getSendJobForTenant(tenantId: string, id: string) {
  return getSendJobByIdForTenant(tenantId, id);
}

export async function updateSendJobForTenant(
  tenantId: string,
  id: string,
  job: Partial<InsertSendJob> & { startedAt?: Date | null; finishedAt?: Date | null },
) {
  return updateSendJobByIdForTenant(tenantId, id, job);
}

export async function getReportTemplatesForTenant(tenantId: string) {
  return listReportTemplatesForTenant(tenantId);
}

export async function getReportTemplateForTenant(tenantId: string, id: string) {
  return getReportTemplateByIdForTenant(tenantId, id);
}

export async function getActiveReportTemplateInTenant(tenantId: string) {
  return getActiveReportTemplateForTenant(tenantId);
}

export async function createReportTemplateForTenant(
  tenantId: string,
  template: InsertReportTemplate,
  options?: { activate?: boolean; id?: string },
) {
  return createReportTemplateRecord(
    {
      ...template,
      tenantId,
    },
    options,
  );
}

export async function setActiveReportTemplateInTenant(tenantId: string, id: string) {
  return setActiveReportTemplateForTenant(tenantId, id);
}

export async function listTenantReportSettings(
  tenantId: string,
  page: number,
  pageSize: number,
): Promise<TenantReportSettingsPage> {
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  const safePageSize = Number.isFinite(pageSize) && pageSize > 0 ? Math.floor(pageSize) : 10;
  const [items, total] = await Promise.all([
    listReportSettingsForTenant(tenantId, { page: safePage, pageSize: safePageSize }),
    countReportSettingsForTenant(tenantId),
  ]);

  return {
    items,
    page: safePage,
    pageSize: safePageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / safePageSize)),
  };
}

export async function getReportSettingForTenant(tenantId: string, id: string) {
  return getReportSettingByIdForTenant(tenantId, id);
}

export async function getDefaultReportSettingInTenant(tenantId: string) {
  return getDefaultReportSettingForTenant(tenantId);
}

export async function createReportSettingForTenant(
  tenantId: string,
  setting: InsertReportSetting,
  options?: { makeDefault?: boolean; id?: string },
) {
  return createReportSettingRecord(
    {
      ...setting,
      tenantId,
    },
    options,
  );
}

export async function updateReportSettingForTenantScope(
  tenantId: string,
  id: string,
  setting: Partial<InsertReportSetting>,
  options?: { makeDefault?: boolean },
) {
  return updateReportSettingForTenant(tenantId, id, setting, options);
}

export async function setDefaultReportSettingInTenant(tenantId: string, id: string) {
  return setDefaultReportSettingForTenant(tenantId, id);
}

export async function getReportInstancesForTenant(tenantId: string, projectId: string) {
  return listReportInstancesByProjectForTenant(tenantId, projectId);
}

export async function getReportInstanceForTenant(tenantId: string, id: string) {
  return getReportInstanceByIdForTenant(tenantId, id);
}

export async function createReportInstanceForTenant(
  tenantId: string,
  instance: InsertReportInstance,
) {
  return createReportInstanceRecord({
    ...instance,
    tenantId,
  });
}

export async function updateReportInstanceForTenantScope(
  tenantId: string,
  id: string,
  instance: Partial<InsertReportInstance> & { completedAt?: Date | null },
) {
  return updateReportInstanceForTenant(tenantId, id, instance);
}

export async function getPublicProjectContextByTrackingToken(
  trackingToken: string,
): Promise<PublicProjectContext | undefined> {
  const normalized = trackingToken.trim();
  if (!normalized) return undefined;

  const projectTarget = await getProjectTargetByTrackingToken(normalized);
  if (!projectTarget) return undefined;

  const tenantId = projectTarget.tenantId || DEFAULT_DEV_TENANT_ID;
  const project = await getProjectByIdForTenant(tenantId, projectTarget.projectId);
  if (!project || project.tenantId !== tenantId) {
    return undefined;
  }

  return {
    tenantId,
    projectTarget,
    project,
  };
}

export async function getPublicPhishingContextByTrackingToken(
  trackingToken: string,
): Promise<PublicPhishingContext | undefined> {
  const context = await getPublicProjectContextByTrackingToken(trackingToken);
  if (!context || !context.project.templateId || !context.project.trainingPageId) {
    return undefined;
  }

  const [template, trainingPage] = await Promise.all([
    getTemplateByIdForTenant(context.tenantId, context.project.templateId),
    getTrainingPageByIdForTenant(context.tenantId, context.project.trainingPageId),
  ]);
  if (!template || !trainingPage) {
    return undefined;
  }

  return {
    ...context,
    template,
    trainingPage,
  };
}

export async function getPublicTrainingContextByTrackingToken(
  trackingToken: string,
): Promise<PublicTrainingContext | undefined> {
  const context = await getPublicProjectContextByTrackingToken(trackingToken);
  if (!context || !context.project.trainingPageId) {
    return undefined;
  }

  const trainingPage = await getTrainingPageByIdForTenant(
    context.tenantId,
    context.project.trainingPageId,
  );
  if (!trainingPage) {
    return undefined;
  }

  return {
    ...context,
    trainingPage,
  };
}
