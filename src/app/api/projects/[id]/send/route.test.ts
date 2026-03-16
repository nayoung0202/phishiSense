import { beforeEach, describe, expect, it, vi } from "vitest";
import { TENANT_A_ID, buildSendJobFixture } from "@/test/tenantFixtures";

const currentTenantMock = vi.hoisted(() => ({
  requireReadyTenant: vi.fn(),
  buildReadyTenantErrorResponse: vi.fn((_error, message: string, status = 500) =>
    Response.json({ error: message }, { status }),
  ),
}));

const sendJobsMock = vi.hoisted(() => ({
  enqueueSendJobForProject: vi.fn(),
}));

vi.mock("@/server/tenant/currentTenant", () => currentTenantMock);
vi.mock("@/server/services/sendJobs", () => sendJobsMock);

import { POST } from "./route";

describe("POST /api/projects/[id]/send", () => {
  beforeEach(() => {
    currentTenantMock.requireReadyTenant.mockReset();
    sendJobsMock.enqueueSendJobForProject.mockReset();
    currentTenantMock.requireReadyTenant.mockResolvedValue({ tenantId: TENANT_A_ID });
  });

  it("활성 잡이 있으면 새로 만들지 않고 기존 잡을 반환한다", async () => {
    const existingJob = buildSendJobFixture({
      id: "job-99",
      tenantId: TENANT_A_ID,
      projectId: "project-1",
      status: "queued",
    });
    sendJobsMock.enqueueSendJobForProject.mockResolvedValue({
      job: existingJob,
      created: false,
    });

    const response = await POST(new Request("http://localhost") as never, {
      params: Promise.resolve({ id: "project-1" }),
    });
    const body = await response.json();

    expect(body.id).toBe("job-99");
    expect(sendJobsMock.enqueueSendJobForProject).toHaveBeenCalledWith(
      TENANT_A_ID,
      "project-1",
    );
  });
});
