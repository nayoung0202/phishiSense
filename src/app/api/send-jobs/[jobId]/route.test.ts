import { beforeEach, describe, expect, it, vi } from "vitest";
import { TENANT_A_ID, buildSendJobFixture } from "@/test/tenantFixtures";

const currentTenantMock = vi.hoisted(() => ({
  requireReadyTenant: vi.fn(),
  buildReadyTenantErrorResponse: vi.fn((_error, message: string, status = 500) =>
    Response.json({ error: message }, { status }),
  ),
}));

const tenantStorageMock = vi.hoisted(() => ({
  getSendJobForTenant: vi.fn(),
}));

vi.mock("@/server/tenant/currentTenant", () => currentTenantMock);
vi.mock("@/server/tenant/tenantStorage", () => tenantStorageMock);

import { GET } from "./route";

const baseJob = buildSendJobFixture({
  id: "job-1",
  tenantId: TENANT_A_ID,
  projectId: "project-1",
  totalCount: 3,
  successCount: 1,
});

beforeEach(() => {
  currentTenantMock.requireReadyTenant.mockReset();
  tenantStorageMock.getSendJobForTenant.mockReset();
  currentTenantMock.requireReadyTenant.mockResolvedValue({ tenantId: TENANT_A_ID });
  tenantStorageMock.getSendJobForTenant.mockResolvedValue(baseJob);
});

describe("GET /api/send-jobs/[jobId]", () => {
  it("잡 상태를 반환한다", async () => {
    const response = await GET(new Request("http://localhost") as never, {
      params: Promise.resolve({ jobId: "job-1" }),
    });
    const body = await response.json();

    expect(body.id).toBe("job-1");
    expect(body.status).toBe("queued");
  });

  it("잡이 없으면 404를 반환한다", async () => {
    tenantStorageMock.getSendJobForTenant.mockResolvedValueOnce(undefined);

    const response = await GET(new Request("http://localhost") as never, {
      params: Promise.resolve({ jobId: "missing-job" }),
    });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("Send job not found");
  });

  it("조회 중 예외가 나면 500을 반환한다", async () => {
    tenantStorageMock.getSendJobForTenant.mockRejectedValueOnce(new Error("db failure"));

    const response = await GET(new Request("http://localhost") as never, {
      params: Promise.resolve({ jobId: "job-1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("Failed to fetch send job");
  });
});
