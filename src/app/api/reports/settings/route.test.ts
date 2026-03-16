import { beforeEach, describe, expect, it, vi } from "vitest";
import { TENANT_A_ID } from "@/test/tenantFixtures";

const currentTenantMock = vi.hoisted(() => ({
  requireReadyTenant: vi.fn(),
  buildReadyTenantErrorResponse: vi.fn((_error, message: string, status = 500) =>
    Response.json({ error: message }, { status }),
  ),
}));

const tenantStorageMock = vi.hoisted(() => ({
  listTenantReportSettings: vi.fn(),
  getDefaultReportSettingInTenant: vi.fn(),
  createReportSettingForTenant: vi.fn(),
}));

const reportStorageMock = vi.hoisted(() => ({
  buildReportSettingLogoFileKey: vi.fn(),
  ensureDirectoryForFile: vi.fn(),
  resolveStoragePath: vi.fn(),
}));

const writeFileMock = vi.hoisted(() => vi.fn());

vi.mock("@/server/tenant/currentTenant", () => currentTenantMock);
vi.mock("@/server/tenant/tenantStorage", () => tenantStorageMock);
vi.mock("@/server/services/reportStorage", () => ({
  buildReportSettingLogoFileKey: reportStorageMock.buildReportSettingLogoFileKey,
  ensureDirectoryForFile: reportStorageMock.ensureDirectoryForFile,
  resolveStoragePath: reportStorageMock.resolveStoragePath,
}));
vi.mock("node:fs", () => ({
  default: { promises: { writeFile: writeFileMock } },
  promises: { writeFile: writeFileMock },
}));

import { GET, POST } from "./route";

describe("GET /api/reports/settings", () => {
  beforeEach(() => {
    currentTenantMock.requireReadyTenant.mockReset();
    tenantStorageMock.listTenantReportSettings.mockReset();
    currentTenantMock.requireReadyTenant.mockResolvedValue({ tenantId: TENANT_A_ID });
  });

  it("페이지네이션 결과를 반환한다", async () => {
    tenantStorageMock.listTenantReportSettings.mockResolvedValue({
      items: [{ id: "s1", name: "기본" }],
      page: 1,
      pageSize: 10,
      total: 1,
      totalPages: 1,
    });

    const response = await GET(
      new Request("http://localhost/api/reports/settings?page=1&pageSize=10") as never,
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(tenantStorageMock.listTenantReportSettings).toHaveBeenCalledWith(TENANT_A_ID, 1, 10);
    expect(body.items).toHaveLength(1);
  });
});

describe("POST /api/reports/settings", () => {
  beforeEach(() => {
    currentTenantMock.requireReadyTenant.mockReset();
    tenantStorageMock.getDefaultReportSettingInTenant.mockReset();
    tenantStorageMock.createReportSettingForTenant.mockReset();
    reportStorageMock.buildReportSettingLogoFileKey.mockReset();
    reportStorageMock.ensureDirectoryForFile.mockReset();
    reportStorageMock.resolveStoragePath.mockReset();
    writeFileMock.mockReset();
    currentTenantMock.requireReadyTenant.mockResolvedValue({ tenantId: TENANT_A_ID });
  });

  it("로고 파일이 없으면 400을 반환한다", async () => {
    const formData = new FormData();
    formData.set("name", "설정1");
    formData.set("companyName", "회사");
    formData.set("approverName", "홍길동");

    const response = await POST({
      formData: vi.fn().mockResolvedValue(formData),
    } as never);

    expect(response.status).toBe(400);
    expect(tenantStorageMock.createReportSettingForTenant).not.toHaveBeenCalled();
  });

  it("정상 요청이면 설정을 생성한다", async () => {
    tenantStorageMock.getDefaultReportSettingInTenant.mockResolvedValue(undefined);
    reportStorageMock.buildReportSettingLogoFileKey.mockReturnValue(
      "tenants/tenant-a/reports/settings/s1/logo.png",
    );
    reportStorageMock.resolveStoragePath.mockReturnValue("C:/tmp/logo.png");
    tenantStorageMock.createReportSettingForTenant.mockResolvedValue({
      id: "s1",
      tenantId: TENANT_A_ID,
      name: "설정1",
      companyName: "회사",
      companyLogoFileKey: "tenants/tenant-a/reports/settings/s1/logo.png",
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
    const logo = new File([new Uint8Array([1, 2, 3])], "logo.png", { type: "image/png" });
    Object.defineProperty(logo, "arrayBuffer", {
      value: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3]).buffer),
    });
    formData.set("logo", logo);

    const response = await POST({
      formData: vi.fn().mockResolvedValue(formData),
    } as never);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(writeFileMock).toHaveBeenCalled();
    expect(tenantStorageMock.createReportSettingForTenant).toHaveBeenCalled();
    expect(body.item.id).toBe("s1");
  });
});
