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

import { GET } from "./route";

beforeEach(() => {
  vi.clearAllMocks();

  project = buildProjectFixture({
    id: "project-1",
    tenantId: TENANT_A_ID,
    openCount: 0,
  });
  projectTarget = buildProjectTargetFixture({
    id: "pt-1",
    tenantId: TENANT_A_ID,
    projectId: "project-1",
    targetId: "target-1",
    trackingToken: "track-1",
    status: "sent",
    openedAt: null,
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

describe("GET /o/[token]", () => {
  it("첫 오픈에서만 openCount를 증가시키고 gif를 반환한다", async () => {
    const response = await GET(new Request("http://localhost/o/track-1"), {
      params: Promise.resolve({ token: "track-1" }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/gif");
    expect(tenantStorageMock.updateProjectTargetForTenant).toHaveBeenCalledTimes(1);
    expect(tenantStorageMock.updateProjectForTenant).toHaveBeenCalledTimes(1);
    expect(project.openCount).toBe(1);
  });

  it("test 대상은 오픈 상태를 기록하되 프로젝트 집계는 증가시키지 않는다", async () => {
    projectTarget = buildProjectTargetFixture({
      id: "pt-1",
      tenantId: TENANT_A_ID,
      projectId: "project-1",
      targetId: "target-1",
      trackingToken: "track-1",
      status: "test",
      openedAt: null,
    });

    tenantStorageMock.getPublicProjectContextByTrackingToken.mockResolvedValue({
      tenantId: TENANT_A_ID,
      projectTarget,
      project,
    });

    await GET(new Request("http://localhost/o/track-1"), {
      params: Promise.resolve({ token: "track-1" }),
    });

    expect(tenantStorageMock.updateProjectTargetForTenant).toHaveBeenCalledTimes(1);
    expect(tenantStorageMock.updateProjectForTenant).not.toHaveBeenCalled();
  });
});
