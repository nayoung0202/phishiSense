import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  TENANT_A_ID,
  buildProjectFixture,
  buildProjectTargetFixture,
} from "@/test/tenantFixtures";

let project: any;
let projectTarget: any;

const tenantStorageMock = vi.hoisted(() => ({
  getPublicProjectContextByTrackingToken: vi.fn(),
  updateProjectTargetForTenant: vi.fn(),
  updateProjectForTenant: vi.fn(),
}));

vi.mock("@/server/tenant/tenantStorage", () => tenantStorageMock);

import { POST } from "./route";

beforeEach(() => {
  vi.clearAllMocks();

  project = buildProjectFixture({
    id: "project-1",
    tenantId: TENANT_A_ID,
    templateId: "template-1",
    trainingPageId: "page-1",
  });
  projectTarget = buildProjectTargetFixture({
    id: "pt-1",
    tenantId: TENANT_A_ID,
    projectId: "project-1",
    targetId: "target-1",
    trackingToken: "track-1",
    status: "sent",
  });

  tenantStorageMock.getPublicProjectContextByTrackingToken.mockImplementation(async () => ({
    tenantId: TENANT_A_ID,
    projectTarget,
    project,
  }));
  tenantStorageMock.updateProjectTargetForTenant.mockImplementation(
    async (_tenantId: string, _id: string, payload: any) => {
      projectTarget = { ...projectTarget, ...payload };
      return projectTarget;
    },
  );
  tenantStorageMock.updateProjectForTenant.mockImplementation(
    async (_tenantId: string, _id: string, payload: any) => {
      project = { ...project, ...payload };
      return project;
    },
  );
});

const buildRequest = () => {
  const formData = new FormData();
  formData.set("input", "test");
  return new Request("http://localhost/p/track-1/submit", {
    method: "POST",
    body: formData,
  });
};

describe("POST /p/[token]/submit", () => {
  it("첫 제출에서만 카운트를 증가시킨다", async () => {
    const response = await POST(buildRequest(), {
      params: Promise.resolve({ token: "track-1" }),
    });

    expect(response.status).toBe(302);
    expect(tenantStorageMock.updateProjectTargetForTenant).toHaveBeenCalledTimes(1);
    expect(tenantStorageMock.updateProjectForTenant).toHaveBeenCalledTimes(1);
    expect(project.submitCount).toBe(1);
    expect(project.openCount).toBe(1);
    expect(project.clickCount).toBe(1);
  });

  it("중복 제출은 카운트를 증가시키지 않는다", async () => {
    await POST(buildRequest(), {
      params: Promise.resolve({ token: "track-1" }),
    });
    await POST(buildRequest(), {
      params: Promise.resolve({ token: "track-1" }),
    });

    expect(tenantStorageMock.updateProjectTargetForTenant).toHaveBeenCalledTimes(1);
    expect(tenantStorageMock.updateProjectForTenant).toHaveBeenCalledTimes(1);
    expect(project.submitCount).toBe(1);
  });
});
