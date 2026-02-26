import { beforeEach, describe, expect, it, vi } from "vitest";

const storageMock = vi.hoisted(() => ({
  getReportSetting: vi.fn(),
  updateReportSetting: vi.fn(),
}));

const reportStorageMock = vi.hoisted(() => ({
  buildReportSettingLogoFileKey: vi.fn(),
  ensureDirectoryForFile: vi.fn(),
  resolveStoragePath: vi.fn(),
}));

const writeFileMock = vi.hoisted(() => vi.fn());

vi.mock("@/server/storage", () => ({
  storage: storageMock,
}));

vi.mock("@/server/services/reportStorage", () => ({
  buildReportSettingLogoFileKey: reportStorageMock.buildReportSettingLogoFileKey,
  ensureDirectoryForFile: reportStorageMock.ensureDirectoryForFile,
  resolveStoragePath: reportStorageMock.resolveStoragePath,
}));

vi.mock("node:fs", () => ({
  promises: {
    writeFile: writeFileMock,
  },
}));

import { PATCH } from "./route";

describe("PATCH /api/reports/settings/[id]", () => {
  beforeEach(() => {
    storageMock.getReportSetting.mockReset();
    storageMock.updateReportSetting.mockReset();
    reportStorageMock.buildReportSettingLogoFileKey.mockReset();
    reportStorageMock.ensureDirectoryForFile.mockReset();
    reportStorageMock.resolveStoragePath.mockReset();
    writeFileMock.mockReset();
  });

  it("대상이 없으면 404를 반환한다", async () => {
    storageMock.getReportSetting.mockResolvedValue(undefined);

    const response = await PATCH(
      new Request("http://localhost/api/reports/settings/unknown", { method: "PATCH", body: new FormData() }),
      { params: Promise.resolve({ id: "unknown" }) },
    );

    expect(response.status).toBe(404);
    expect(storageMock.updateReportSetting).not.toHaveBeenCalled();
  });

  it("로고 없이 필드를 수정할 수 있다", async () => {
    storageMock.getReportSetting.mockResolvedValue({
      id: "s1",
      name: "기존",
      companyName: "기존회사",
      companyLogoFileKey: "reports/settings/s1/logo.png",
      approverName: "기존승인자",
      approverTitle: "",
      isDefault: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    storageMock.updateReportSetting.mockResolvedValue({
      id: "s1",
      name: "변경",
      companyName: "변경회사",
      companyLogoFileKey: "reports/settings/s1/logo.png",
      approverName: "홍길동",
      approverTitle: "",
      isDefault: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const formData = new FormData();
    formData.set("name", "변경");
    formData.set("companyName", "변경회사");
    formData.set("approverName", "홍길동");
    formData.set("isDefault", "true");

    const response = await PATCH(
      new Request("http://localhost/api/reports/settings/s1", { method: "PATCH", body: formData }),
      { params: Promise.resolve({ id: "s1" }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(storageMock.updateReportSetting).toHaveBeenCalledWith(
      "s1",
      expect.objectContaining({
        name: "변경",
        companyName: "변경회사",
        approverName: "홍길동",
      }),
      { makeDefault: true },
    );
    expect(writeFileMock).not.toHaveBeenCalled();
    expect(body.item.id).toBe("s1");
  });
});
