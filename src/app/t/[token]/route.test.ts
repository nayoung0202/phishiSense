import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import {
  TENANT_A_ID,
  buildProjectFixture,
  buildProjectTargetFixture,
  buildTrainingPageFixture,
} from "@/test/tenantFixtures";

let project: any;
let projectTarget: any;

const tenantStorageMock = vi.hoisted(() => ({
  getPublicTrainingContextByTrackingToken: vi.fn(),
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

  tenantStorageMock.getPublicTrainingContextByTrackingToken.mockImplementation(async () => ({
    tenantId: TENANT_A_ID,
    projectTarget,
    project,
    trainingPage: buildTrainingPageFixture({
      id: "page-1",
      tenantId: TENANT_A_ID,
      content: "<p>훈련</p>",
      status: "active",
    }),
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

describe("GET /t/[trackingToken]", () => {
  it("중복 호출 시 제출 카운트가 한번만 증가한다", async () => {
    const request = new NextRequest("http://localhost/t/track-1", {
      headers: { cookie: "ps_flow_token=track-1" },
    });

    await GET(request, {
      params: Promise.resolve({ token: "track-1" }),
    });

    const secondRequest = new NextRequest("http://localhost/t/track-1", {
      headers: { cookie: "ps_flow_token=track-1" },
    });

    await GET(secondRequest, {
      params: Promise.resolve({ token: "track-1" }),
    });

    expect(tenantStorageMock.updateProjectForTenant).toHaveBeenCalledTimes(1);
    expect(project.openCount).toBe(1);
    expect(project.clickCount).toBe(1);
    expect(project.submitCount).toBe(1);
  });
});
