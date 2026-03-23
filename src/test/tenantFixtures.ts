import type {
  Project,
  ProjectTarget,
  ReportInstance,
  SendJob,
  Target,
  Template,
  TrainingPage,
} from "@shared/schema";
import type { PlatformMeTenant } from "@/server/platform/types";

export const TENANT_A_ID = "tenant-a";
export const TENANT_B_ID = "tenant-b";

export type TenantScoped<T> = T & {
  tenantId: string;
};

type Overrides<T> = Partial<TenantScoped<T>>;

export function buildTenant(
  overrides: Partial<PlatformMeTenant> = {},
): PlatformMeTenant {
  return {
    tenantId: overrides.tenantId ?? TENANT_A_ID,
    name: overrides.name ?? "Tenant A",
    role: overrides.role ?? "OWNER",
  };
}

export function buildProjectFixture(
  overrides: Overrides<Project> = {},
): TenantScoped<Project> {
  return {
    id: overrides.id ?? "project-1",
    tenantId: overrides.tenantId ?? TENANT_A_ID,
    name: overrides.name ?? "테스트 프로젝트",
    description: overrides.description ?? null,
    department: overrides.department ?? null,
    departmentTags: overrides.departmentTags ?? [],
    templateId: overrides.templateId ?? "template-1",
    trainingPageId: overrides.trainingPageId ?? "page-1",
    trainingLinkToken: overrides.trainingLinkToken ?? "token-1",
    smtpAccountId: overrides.smtpAccountId ?? null,
    fromName: overrides.fromName ?? null,
    fromEmail: overrides.fromEmail ?? null,
    timezone: overrides.timezone ?? "Asia/Seoul",
    notificationEmails: overrides.notificationEmails ?? [],
    startDate: overrides.startDate ?? new Date("2025-01-01T00:00:00Z"),
    endDate: overrides.endDate ?? new Date("2025-01-02T00:00:00Z"),
    status: overrides.status ?? "진행중",
    targetCount: overrides.targetCount ?? 1,
    openCount: overrides.openCount ?? 0,
    clickCount: overrides.clickCount ?? 0,
    submitCount: overrides.submitCount ?? 0,
    reportCaptureInboxFileKey: overrides.reportCaptureInboxFileKey ?? null,
    reportCaptureEmailFileKey: overrides.reportCaptureEmailFileKey ?? null,
    reportCaptureMaliciousFileKey:
      overrides.reportCaptureMaliciousFileKey ?? null,
    reportCaptureTrainingFileKey:
      overrides.reportCaptureTrainingFileKey ?? null,
    sendValidationError: overrides.sendValidationError ?? null,
    fiscalYear: overrides.fiscalYear ?? null,
    fiscalQuarter: overrides.fiscalQuarter ?? null,
    weekOfYear: overrides.weekOfYear ?? [],
    createdAt: overrides.createdAt ?? new Date("2024-12-31T00:00:00Z"),
  };
}

export function buildTemplateFixture(
  overrides: Overrides<Template> = {},
): TenantScoped<Template> {
  return {
    id: overrides.id ?? "template-1",
    tenantId: overrides.tenantId ?? TENANT_A_ID,
    name: overrides.name ?? "기본 템플릿",
    subject: overrides.subject ?? "보안 공지",
    body: overrides.body ?? "<p>template body</p>",
    maliciousPageContent:
      overrides.maliciousPageContent ?? "<p>malicious page</p>",
    autoInsertLandingEnabled:
      overrides.autoInsertLandingEnabled ?? true,
    autoInsertLandingLabel:
      overrides.autoInsertLandingLabel ?? "문서 확인하기",
    autoInsertLandingKind: overrides.autoInsertLandingKind ?? "link",
    autoInsertLandingNewTab: overrides.autoInsertLandingNewTab ?? true,
    createdAt: overrides.createdAt ?? new Date("2024-12-31T00:00:00Z"),
    updatedAt: overrides.updatedAt ?? new Date("2024-12-31T00:00:00Z"),
  };
}

export function buildTrainingPageFixture(
  overrides: Overrides<TrainingPage> = {},
): TenantScoped<TrainingPage> {
  return {
    id: overrides.id ?? "page-1",
    tenantId: overrides.tenantId ?? TENANT_A_ID,
    name: overrides.name ?? "기본 교육 페이지",
    description: overrides.description ?? null,
    content: overrides.content ?? "<p>training page</p>",
    status: overrides.status ?? "active",
    createdAt: overrides.createdAt ?? new Date("2024-12-31T00:00:00Z"),
    updatedAt: overrides.updatedAt ?? new Date("2024-12-31T00:00:00Z"),
  };
}

export function buildTargetFixture(
  overrides: Overrides<Target> = {},
): TenantScoped<Target> {
  return {
    id: overrides.id ?? "target-1",
    tenantId: overrides.tenantId ?? TENANT_A_ID,
    name: overrides.name ?? "홍길동",
    email: overrides.email ?? "hong@example.com",
    department: overrides.department ?? null,
    tags: overrides.tags ?? [],
    status: overrides.status ?? "active",
    createdAt: overrides.createdAt ?? new Date("2024-12-31T00:00:00Z"),
  };
}

export function buildProjectTargetFixture(
  overrides: Overrides<ProjectTarget> = {},
): TenantScoped<ProjectTarget> {
  return {
    id: overrides.id ?? "project-target-1",
    tenantId: overrides.tenantId ?? TENANT_A_ID,
    projectId: overrides.projectId ?? "project-1",
    targetId: overrides.targetId ?? "target-1",
    trackingToken: overrides.trackingToken ?? "tracking-token-1",
    status: overrides.status ?? "sent",
    sendStatus: overrides.sendStatus ?? "pending",
    sentAt: overrides.sentAt ?? null,
    sendError: overrides.sendError ?? null,
    openedAt: overrides.openedAt ?? null,
    clickedAt: overrides.clickedAt ?? null,
    submittedAt: overrides.submittedAt ?? null,
  };
}

export function buildSendJobFixture(
  overrides: Overrides<SendJob> = {},
): TenantScoped<SendJob> {
  return {
    id: overrides.id ?? "send-job-1",
    tenantId: overrides.tenantId ?? TENANT_A_ID,
    projectId: overrides.projectId ?? "project-1",
    status: overrides.status ?? "queued",
    createdAt: overrides.createdAt ?? new Date("2025-01-01T00:00:00Z"),
    startedAt: overrides.startedAt ?? null,
    finishedAt: overrides.finishedAt ?? null,
    attempts: overrides.attempts ?? 0,
    lastError: overrides.lastError ?? null,
    totalCount: overrides.totalCount ?? 0,
    successCount: overrides.successCount ?? 0,
    failCount: overrides.failCount ?? 0,
  };
}

export function buildReportInstanceFixture(
  overrides: Overrides<ReportInstance> = {},
): TenantScoped<ReportInstance> {
  return {
    id: overrides.id ?? "report-instance-1",
    tenantId: overrides.tenantId ?? TENANT_A_ID,
    projectId: overrides.projectId ?? "project-1",
    templateId: overrides.templateId ?? "template-1",
    reportSettingId: overrides.reportSettingId ?? "report-setting-1",
    status: overrides.status ?? "completed",
    fileKey: overrides.fileKey ?? "reports/generated/report-instance-1.docx",
    errorMessage: overrides.errorMessage ?? null,
    createdAt: overrides.createdAt ?? new Date("2025-01-01T00:00:00Z"),
    completedAt: overrides.completedAt ?? new Date("2025-01-02T00:00:00Z"),
  };
}
