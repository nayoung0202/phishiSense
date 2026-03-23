import { beforeEach, describe, expect, it, vi } from "vitest";
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
  getTargetsForTenant: vi.fn(),
}));

const seatCapacityMock = vi.hoisted(() => ({
  isTargetSeatLimitError: vi.fn(),
  resolveTargetSeatLimit: vi.fn(),
}));

vi.mock("@/server/tenant/currentTenant", () => currentTenantMock);
vi.mock("@/server/tenant/tenantStorage", () => tenantStorageMock);
vi.mock("@/server/services/targetSeatCapacity", () => seatCapacityMock);

import { POST } from "./route";

describe("POST /api/targets", () => {
  beforeEach(() => {
    currentTenantMock.requireReadyTenant.mockReset();
    tenantStorageMock.findTargetByEmailInTenant.mockReset();
    tenantStorageMock.createTargetForTenantWithinSeatLimit.mockReset();
    seatCapacityMock.isTargetSeatLimitError.mockReset();
    seatCapacityMock.resolveTargetSeatLimit.mockReset();
    seatCapacityMock.isTargetSeatLimitError.mockReturnValue(false);
    seatCapacityMock.resolveTargetSeatLimit.mockReturnValue(50);
    currentTenantMock.requireReadyTenant.mockResolvedValue({
      tenantId: TENANT_A_ID,
      platform: {
        platformProduct: { seatLimit: 50 },
        localEntitlement: { seatLimit: 50 },
      },
    });
  });

  it("중복 이메일이면 409를 반환한다", async () => {
    tenantStorageMock.findTargetByEmailInTenant.mockResolvedValue({
      id: "target-1",
      email: "dup@example.com",
    });

    const response = await POST(
      new Request("http://localhost/api/targets", {
        method: "POST",
        body: JSON.stringify({
          name: "중복 대상",
          email: "dup@example.com",
          department: "보안팀",
          status: "active",
        }),
      }) as never,
    );
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error).toBe("duplicate_email");
    expect(tenantStorageMock.findTargetByEmailInTenant).toHaveBeenCalledWith(
      TENANT_A_ID,
      "dup@example.com",
    );
  });

  it("seatLimit을 초과하면 409를 반환한다", async () => {
    const seatLimitError = {
      status: 409,
      code: "seat_limit_exceeded",
      message: "대상자 시트 한도를 초과했습니다.",
      seatLimit: 50,
      usedSeats: 50,
      remainingSeats: 0,
    };
    tenantStorageMock.createTargetForTenantWithinSeatLimit.mockImplementation(() => {
      throw seatLimitError;
    });
    seatCapacityMock.isTargetSeatLimitError.mockImplementation(
      (error: unknown) => error === seatLimitError,
    );
    tenantStorageMock.findTargetByEmailInTenant.mockResolvedValue(undefined);

    const response = await POST(
      new Request("http://localhost/api/targets", {
        method: "POST",
        body: JSON.stringify({
          name: "신규 대상",
          email: "new@example.com",
          department: "보안팀",
          status: "active",
        }),
      }) as never,
    );
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error).toBe("seat_limit_exceeded");
    expect(tenantStorageMock.createTargetForTenantWithinSeatLimit).toHaveBeenCalledWith(
      TENANT_A_ID,
      expect.objectContaining({
        email: "new@example.com",
      }),
      50,
    );
  });
});
