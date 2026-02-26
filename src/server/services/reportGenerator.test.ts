import { beforeEach, describe, expect, it, vi } from "vitest";

const storageMock = vi.hoisted(() => ({
  getProject: vi.fn(),
  getReportSetting: vi.fn(),
}));

const reportStorageMock = vi.hoisted(() => ({
  fileExists: vi.fn(),
  resolveStoragePath: vi.fn(),
}));

vi.mock("@/server/storage", () => ({
  storage: storageMock,
}));

vi.mock("./reportStorage", async () => {
  const actual = await vi.importActual<typeof import("./reportStorage")>("./reportStorage");
  return {
    ...actual,
    fileExists: reportStorageMock.fileExists,
    resolveStoragePath: reportStorageMock.resolveStoragePath,
  };
});

import { generateProjectReport } from "./reportGenerator";

describe("reportGenerator report setting validation", () => {
  beforeEach(() => {
    storageMock.getProject.mockReset();
    storageMock.getReportSetting.mockReset();
    reportStorageMock.fileExists.mockReset();
    reportStorageMock.resolveStoragePath.mockReset();

    storageMock.getProject.mockResolvedValue({
      id: "project-1",
      name: "?꾨줈?앺듃",
      description: null,
      department: null,
      departmentTags: [],
      templateId: "template-1",
      trainingPageId: null,
      trainingLinkToken: null,
      sendingDomain: null,
      fromName: null,
      fromEmail: null,
      timezone: "Asia/Seoul",
      startDate: new Date("2025-01-01T00:00:00Z"),
      endDate: new Date("2025-01-10T00:00:00Z"),
      status: "?꾨즺",
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
    reportStorageMock.fileExists.mockResolvedValue(true);
  });

  it("reportSettingId???대떦?섎뒗 ?ㅼ젙???놁쑝硫??ㅽ뙣?쒕떎", async () => {
    storageMock.getReportSetting.mockResolvedValue(undefined);

    await expect(
      generateProjectReport("project-1", { reportSettingId: "missing-setting" }),
    ).rejects.toThrow("蹂닿퀬???ㅼ젙");
  });

  it("?ㅼ젙 濡쒓퀬 ?뚯씪???놁쑝硫??ㅽ뙣?쒕떎", async () => {
    storageMock.getReportSetting.mockResolvedValue({
      id: "setting-1",
      name: "湲곕낯",
      companyName: "?뚯궗",
      companyLogoFileKey: "reports/settings/setting-1/logo.png",
      approverName: "?띻만??,
      approverTitle: "???,
      isDefault: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    reportStorageMock.resolveStoragePath.mockReturnValue("C:/tmp/logo.png");
    reportStorageMock.fileExists.mockImplementation(async (path: string) => path !== "C:/tmp/logo.png");

    await expect(
      generateProjectReport("project-1", { reportSettingId: "setting-1" }),
    ).rejects.toThrow("濡쒓퀬");
  });
});

