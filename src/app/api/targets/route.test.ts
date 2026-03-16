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
  createTargetForTenant: vi.fn(),
  getTargetsForTenant: vi.fn(),
}));

vi.mock("@/server/tenant/currentTenant", () => currentTenantMock);
vi.mock("@/server/tenant/tenantStorage", () => tenantStorageMock);

import { POST } from "./route";

describe("POST /api/targets", () => {
  beforeEach(() => {
    currentTenantMock.requireReadyTenant.mockReset();
    tenantStorageMock.findTargetByEmailInTenant.mockReset();
    tenantStorageMock.createTargetForTenant.mockReset();
    currentTenantMock.requireReadyTenant.mockResolvedValue({ tenantId: TENANT_A_ID });
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
});
