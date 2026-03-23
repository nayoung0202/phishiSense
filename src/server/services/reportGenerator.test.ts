import { beforeEach, describe, expect, it, vi } from "vitest";

const tenantStorageMock = vi.hoisted(() => ({
  getProjectForTenant: vi.fn(),
  getReportSettingForTenant: vi.fn(),
  getReportTemplateForTenant: vi.fn(),
  getActiveReportTemplateInTenant: vi.fn(),
  createReportTemplateForTenant: vi.fn(),
  getProjectTargetsForTenant: vi.fn(),
  getTargetForTenant: vi.fn(),
  getTemplateForTenant: vi.fn(),
  createReportInstanceForTenant: vi.fn(),
  updateReportInstanceForTenantScope: vi.fn(),
}));

const reportStorageMock = vi.hoisted(() => ({
  buildTemplateFileKey: vi.fn(),
  buildReportFileKey: vi.fn(),
  ensureDirectoryForFile: vi.fn(),
  fileExists: vi.fn(),
  resolveStoragePath: vi.fn(),
}));

vi.mock("../tenant/tenantStorage", () => ({
  getProjectForTenant: tenantStorageMock.getProjectForTenant,
  getReportSettingForTenant: tenantStorageMock.getReportSettingForTenant,
  getReportTemplateForTenant: tenantStorageMock.getReportTemplateForTenant,
  getActiveReportTemplateInTenant: tenantStorageMock.getActiveReportTemplateInTenant,
  createReportTemplateForTenant: tenantStorageMock.createReportTemplateForTenant,
  getProjectTargetsForTenant: tenantStorageMock.getProjectTargetsForTenant,
  getTargetForTenant: tenantStorageMock.getTargetForTenant,
  getTemplateForTenant: tenantStorageMock.getTemplateForTenant,
  createReportInstanceForTenant: tenantStorageMock.createReportInstanceForTenant,
  updateReportInstanceForTenantScope: tenantStorageMock.updateReportInstanceForTenantScope,
}));

vi.mock("./reportStorage", () => ({
  buildTemplateFileKey: reportStorageMock.buildTemplateFileKey,
  buildReportFileKey: reportStorageMock.buildReportFileKey,
  ensureDirectoryForFile: reportStorageMock.ensureDirectoryForFile,
  fileExists: reportStorageMock.fileExists,
  resolveStoragePath: reportStorageMock.resolveStoragePath,
}));

import { generateProjectReport } from "./reportGenerator";

describe("reportGenerator report setting validation", () => {
  beforeEach(() => {
    tenantStorageMock.getProjectForTenant.mockReset();
    tenantStorageMock.getReportSettingForTenant.mockReset();
    reportStorageMock.fileExists.mockReset();
    reportStorageMock.resolveStoragePath.mockReset();

    tenantStorageMock.getProjectForTenant.mockResolvedValue({
      id: "project-1",
      tenantId: "tenant-a",
      name: "테스트 프로젝트",
      description: null,
      department: null,
      departmentTags: [],
      templateId: "template-1",
      trainingPageId: null,
      trainingLinkToken: "training-token-1",
      smtpAccountId: null,
      fromName: null,
      fromEmail: null,
      timezone: "Asia/Seoul",
      notificationEmails: [],
      startDate: new Date("2025-01-01T00:00:00Z"),
      endDate: new Date("2025-01-10T00:00:00Z"),
      status: "완료",
      targetCount: 0,
      openCount: 0,
      clickCount: 0,
      submitCount: 0,
      reportCaptureInboxFileKey: null,
      reportCaptureEmailFileKey: null,
      reportCaptureMaliciousFileKey: null,
      reportCaptureTrainingFileKey: null,
      sendValidationError: null,
      fiscalYear: 2025,
      fiscalQuarter: 1,
      weekOfYear: [],
      createdAt: new Date("2025-01-01T00:00:00Z"),
    });
  });

  it("reportSettingId에 해당하는 설정이 없으면 실패한다", async () => {
    tenantStorageMock.getReportSettingForTenant.mockResolvedValue(undefined);

    await expect(
      generateProjectReport("tenant-a", "project-1", { reportSettingId: "missing-setting" }),
    ).rejects.toThrow("보고서 설정");
  });

  it("설정 로고 파일이 없으면 실패한다", async () => {
    tenantStorageMock.getReportSettingForTenant.mockResolvedValue({
      id: "setting-1",
      tenantId: "tenant-a",
      name: "기본 설정",
      companyName: "테스트 회사",
      companyLogoFileKey: "tenants/tenant-a/reports/settings/setting-1/logo.png",
      approverName: "보안 책임자",
      approverTitle: "이사",
      isDefault: true,
      createdAt: new Date("2025-01-01T00:00:00Z"),
      updatedAt: new Date("2025-01-01T00:00:00Z"),
    });
    reportStorageMock.resolveStoragePath.mockReturnValue("/tmp/logo.png");
    reportStorageMock.fileExists.mockImplementation(async (path: string) => path !== "/tmp/logo.png");

    await expect(
      generateProjectReport("tenant-a", "project-1", { reportSettingId: "setting-1" }),
    ).rejects.toThrow("로고");
  });
});
