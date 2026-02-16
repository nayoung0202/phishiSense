import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

let project: any;
let projectTarget: any;

const storageMock = {
  getProjectTargetByTrackingToken: vi.fn(),
  getProjectByTrainingLinkToken: vi.fn(),
  getProject: vi.fn(),
  getTrainingPage: vi.fn(),
  updateProjectTarget: vi.fn(),
  updateProject: vi.fn(),
};

vi.mock("@/server/storage", () => ({
  storage: storageMock,
}));

import { GET } from "./route";

beforeEach(() => {
  project = {
    id: "project-1",
    name: "테스트 프로젝트",
    description: null,
    department: null,
    departmentTags: [],
    templateId: "template-1",
    trainingPageId: "page-1",
    trainingLinkToken: "token-1",
    sendingDomain: null,
    fromName: null,
    fromEmail: null,
    timezone: "Asia/Seoul",
    notificationEmails: [],
    startDate: new Date("2025-01-01T00:00:00Z"),
    endDate: new Date("2025-01-02T00:00:00Z"),
    status: "진행중",
    targetCount: 1,
    openCount: 0,
    clickCount: 0,
    submitCount: 0,
    reportCaptureInboxFileKey: null,
    reportCaptureEmailFileKey: null,
    reportCaptureMaliciousFileKey: null,
    reportCaptureTrainingFileKey: null,
    sendValidationError: null,
    fiscalYear: null,
    fiscalQuarter: null,
    weekOfYear: [],
    createdAt: new Date("2024-12-31T00:00:00Z"),
  };

  projectTarget = {
    id: "pt-1",
    projectId: "project-1",
    targetId: "target-1",
    trackingToken: "track-1",
    status: "sent",
    openedAt: null,
    clickedAt: null,
    submittedAt: null,
  };

  storageMock.getProjectTargetByTrackingToken.mockResolvedValue(projectTarget);
  storageMock.getProject.mockResolvedValue(project);
  storageMock.getTrainingPage.mockResolvedValue({
    id: "page-1",
    name: "페이지",
    description: null,
    content: "<p>훈련</p>",
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  storageMock.updateProjectTarget.mockImplementation(async (_id: string, payload: any) => {
    projectTarget = { ...projectTarget, ...payload };
    return projectTarget;
  });
  storageMock.updateProject.mockImplementation(async (_id: string, payload: any) => {
    project = { ...project, ...payload };
    return project;
  });
});

describe("GET /t/[trackingToken]", () => {
  it("중복 호출 시 제출 카운트가 한번만 증가한다", async () => {
    const request = new NextRequest("http://localhost/t/track-1", {
      headers: {
        cookie: "ps_flow_token=track-1",
      },
    });

    await GET(request, {
      params: Promise.resolve({ token: "track-1" }),
    });

    const secondRequest = new NextRequest("http://localhost/t/track-1", {
      headers: {
        cookie: "ps_flow_token=track-1",
      },
    });

    await GET(secondRequest, {
      params: Promise.resolve({ token: "track-1" }),
    });

    expect(storageMock.updateProject).toHaveBeenCalledTimes(1);
    expect(project.openCount).toBe(1);
    expect(project.clickCount).toBe(1);
    expect(project.submitCount).toBe(1);
  });
});
