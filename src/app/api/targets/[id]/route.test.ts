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
  updateTargetForTenant: vi.fn(),
}));

vi.mock("@/server/tenant/currentTenant", () => currentTenantMock);
vi.mock("@/server/tenant/tenantStorage", () => tenantStorageMock);

import { PATCH } from "./route";

describe("PATCH /api/targets/[id]", () => {
  beforeEach(() => {
    currentTenantMock.requireReadyTenant.mockReset();
    tenantStorageMock.findTargetByEmailInTenant.mockReset();
    tenantStorageMock.updateTargetForTenant.mockReset();
    currentTenantMock.requireReadyTenant.mockResolvedValue({ tenantId: TENANT_A_ID });
  });

  it("다른 대상과 이메일이 충돌하면 409를 반환한다", async () => {
    tenantStorageMock.findTargetByEmailInTenant.mockResolvedValue({
      id: "target-2",
      email: "dup@example.com",
    });

    const response = await PATCH(
      new Request("http://localhost/api/targets/target-1", {
        method: "PATCH",
        body: JSON.stringify({ email: "dup@example.com" }),
      }) as never,
      { params: Promise.resolve({ id: "target-1" }) },
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
