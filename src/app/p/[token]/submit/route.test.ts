import { describe, expect, it, vi, beforeEach } from "vitest";

let project: any;
let projectTarget: any;

const storageMock = vi.hoisted(() => ({
  getProjectTargetByTrackingToken: vi.fn(),
  getProject: vi.fn(),
  updateProjectTarget: vi.fn(),
  updateProject: vi.fn(),
}));

vi.mock("@/server/storage", () => ({
  storage: storageMock,
}));

import { POST } from "./route";

beforeEach(() => {
  vi.clearAllMocks();

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

  storageMock.getProjectTargetByTrackingToken.mockImplementation(async () => projectTarget);
  storageMock.getProject.mockImplementation(async () => project);
  storageMock.updateProjectTarget.mockImplementation(async (_id: string, payload: any) => {
    projectTarget = { ...projectTarget, ...payload };
    return projectTarget;
  });
  storageMock.updateProject.mockImplementation(async (_id: string, payload: any) => {
    project = { ...project, ...payload };
    return project;
  });
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
    expect(storageMock.updateProjectTarget).toHaveBeenCalledTimes(1);
    expect(storageMock.updateProject).toHaveBeenCalledTimes(1);
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

    expect(storageMock.updateProjectTarget).toHaveBeenCalledTimes(1);
    expect(storageMock.updateProject).toHaveBeenCalledTimes(1);
    expect(project.submitCount).toBe(1);
  });
});
