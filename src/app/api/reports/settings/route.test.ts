import { beforeEach, describe, expect, it, vi } from "vitest";

const storageMock = vi.hoisted(() => ({
  listReportSettings: vi.fn(),
  getDefaultReportSetting: vi.fn(),
  createReportSetting: vi.fn(),
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

import { GET, POST } from "./route";

describe("GET /api/reports/settings", () => {
  beforeEach(() => {
    storageMock.listReportSettings.mockReset();
  });

  it("페이지네이션 결과를 반환한다", async () => {
    storageMock.listReportSettings.mockResolvedValue({
      items: [{ id: "s1", name: "기본" }],
      page: 1,
      pageSize: 10,
      total: 1,
      totalPages: 1,
    });

    const response = await GET(new Request("http://localhost/api/reports/settings?page=1&pageSize=10"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(storageMock.listReportSettings).toHaveBeenCalledWith(1, 10);
    expect(body.items).toHaveLength(1);
  });
});

describe("POST /api/reports/settings", () => {
  beforeEach(() => {
    storageMock.getDefaultReportSetting.mockReset();
    storageMock.createReportSetting.mockReset();
    reportStorageMock.buildReportSettingLogoFileKey.mockReset();
    reportStorageMock.ensureDirectoryForFile.mockReset();
    reportStorageMock.resolveStoragePath.mockReset();
    writeFileMock.mockReset();
  });

  it("로고 파일이 없으면 400을 반환한다", async () => {
    const formData = new FormData();
    formData.set("name", "설정1");
    formData.set("companyName", "회사");
    formData.set("approverName", "홍길동");

    const response = await POST(
      new Request("http://localhost/api/reports/settings", {
        method: "POST",
        body: formData,
      }),
    );

    expect(response.status).toBe(400);
    expect(storageMock.createReportSetting).not.toHaveBeenCalled();
  });

  it("정상 요청이면 설정을 생성한다", async () => {
    storageMock.getDefaultReportSetting.mockResolvedValue(undefined);
    reportStorageMock.buildReportSettingLogoFileKey.mockReturnValue("reports/settings/s1/logo.png");
    reportStorageMock.resolveStoragePath.mockReturnValue("C:/tmp/logo.png");
    storageMock.createReportSetting.mockResolvedValue({
      id: "s1",
      name: "설정1",
      companyName: "회사",
      companyLogoFileKey: "reports/settings/s1/logo.png",
      approverName: "홍길동",
      approverTitle: "",
      isDefault: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const formData = new FormData();
    formData.set("name", "설정1");
    formData.set("companyName", "회사");
    formData.set("approverName", "홍길동");
    formData.set("isDefault", "true");
    formData.set("logo", new File([new Uint8Array([1, 2, 3])], "logo.png", { type: "image/png" }));

    const response = await POST(
      new Request("http://localhost/api/reports/settings", {
        method: "POST",
        body: formData,
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(writeFileMock).toHaveBeenCalled();
    expect(storageMock.createReportSetting).toHaveBeenCalled();
    expect(body.item.id).toBe("s1");
  });
});
