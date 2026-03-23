import { beforeEach, describe, expect, it, vi } from "vitest";
import ExcelJS from "exceljs";
import { TENANT_A_ID } from "@/test/tenantFixtures";

const currentTenantMock = vi.hoisted(() => ({
  requireReadyTenant: vi.fn(),
  buildReadyTenantErrorResponse: vi.fn((_error, message: string, status = 500) =>
    Response.json({ error: message }, { status }),
  ),
}));

const tenantStorageMock = vi.hoisted(() => ({
  findTargetByEmailInTenant: vi.fn(),
  createTargetForTenantWithinSeatLimit: vi.fn(),
}));

const seatCapacityMock = vi.hoisted(() => ({
  isTargetSeatLimitError: vi.fn(),
  resolveTargetSeatLimit: vi.fn(),
}));

vi.mock("@/server/tenant/currentTenant", () => currentTenantMock);
vi.mock("@/server/tenant/tenantStorage", () => tenantStorageMock);
vi.mock("@/server/services/targetSeatCapacity", () => seatCapacityMock);

import { POST } from "./route";

async function createWorkbookBuffer(rows: Array<[string, string, string, string?, string?]>) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("훈련대상");
  worksheet.addRow(["이름", "이메일", "소속", "태그", "상태"]);
  rows.forEach((row) => worksheet.addRow(row));
  return workbook.xlsx.writeBuffer();
}

describe("POST /api/admin/training-targets/import", () => {
  beforeEach(() => {
    currentTenantMock.requireReadyTenant.mockReset();
    tenantStorageMock.findTargetByEmailInTenant.mockReset();
    tenantStorageMock.createTargetForTenantWithinSeatLimit.mockReset();
    seatCapacityMock.isTargetSeatLimitError.mockReset();
    seatCapacityMock.resolveTargetSeatLimit.mockReset();
    currentTenantMock.requireReadyTenant.mockResolvedValue({
      tenantId: TENANT_A_ID,
      platform: {
        platformProduct: { seatLimit: 2 },
        localEntitlement: { seatLimit: 2 },
      },
    });
    tenantStorageMock.findTargetByEmailInTenant.mockResolvedValue(undefined);
    seatCapacityMock.resolveTargetSeatLimit.mockReturnValue(2);
    const seatLimitError = {
      message: "대상자 시트 한도를 초과했습니다.",
    };
    tenantStorageMock.createTargetForTenantWithinSeatLimit.mockImplementation(() => {
      throw seatLimitError;
    });
    seatCapacityMock.isTargetSeatLimitError.mockImplementation(
      (error: unknown) => error === seatLimitError,
    );
  });

  it("남은 시트가 없으면 모든 신규 행을 실패 처리한다", async () => {
    const formData = new FormData();
    const buffer = await createWorkbookBuffer([
      ["홍길동", "hong@example.com", "보안팀", "", "active"],
    ]);
    formData.append(
      "file",
      new File([buffer], "targets.xlsx", {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
    );

    const response = await POST(
      new Request("http://localhost/api/admin/training-targets/import", {
        method: "POST",
        body: formData,
      }) as never,
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.successCount).toBe(0);
    expect(body.failCount).toBe(1);
    expect(body.failures[0]?.reason).toBe("대상자 시트 한도를 초과했습니다.");
    expect(tenantStorageMock.createTargetForTenantWithinSeatLimit).toHaveBeenCalledTimes(1);
  });
});
