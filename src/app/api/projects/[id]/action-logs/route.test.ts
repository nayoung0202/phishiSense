import { describe, expect, it, vi, beforeEach } from "vitest";

const storageMock = vi.hoisted(() => ({
  getProject: vi.fn(),
  getProjectTargets: vi.fn(),
  getTargets: vi.fn(),
}));

vi.mock("@/server/storage", () => ({
  storage: storageMock,
}));

import { GET } from "./route";

const baseProject = {
  id: "project-1",
  name: "테스트 프로젝트",
  description: null,
  department: null,
  departmentTags: [],
  templateId: null,
  trainingPageId: null,
  trainingLinkToken: "token-1",
  sendingDomain: null,
  fromName: null,
  fromEmail: null,
  timezone: "Asia/Seoul",
  startDate: new Date("2025-01-01T00:00:00Z"),
  endDate: new Date("2025-01-02T00:00:00Z"),
  status: "진행중",
  targetCount: 0,
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

const baseTarget = {
  id: "target-1",
  name: "김철수",
  email: "kim@example.com",
  department: "영업부",
  tags: [],
  status: "active",
  createdAt: new Date("2024-12-31T00:00:00Z"),
};

beforeEach(() => {
  storageMock.getProject.mockResolvedValue(baseProject);
  storageMock.getTargets.mockResolvedValue([baseTarget]);
});

describe("GET /api/projects/[id]/action-logs", () => {
  it("해당 프로젝트 대상자만 반환한다", async () => {
    storageMock.getProjectTargets.mockResolvedValue([
      {
        id: "pt-1",
        projectId: "project-1",
        targetId: "target-1",
        trackingToken: "track-1",
        status: "sent",
        openedAt: null,
        clickedAt: null,
        submittedAt: null,
      },
      {
        id: "pt-2",
        projectId: "project-2",
        targetId: "target-2",
        trackingToken: "track-2",
        status: "sent",
        openedAt: null,
        clickedAt: null,
        submittedAt: null,
      },
    ]);

    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ id: "project-1" }),
    });
    const body = await response.json();

    expect(body.items).toHaveLength(1);
    expect(body.items[0].targetId).toBe("target-1");
  });

  it("이벤트를 시간순으로 정렬한다", async () => {
    storageMock.getProjectTargets.mockResolvedValue([
      {
        id: "pt-1",
        projectId: "project-1",
        targetId: "target-1",
        trackingToken: "track-1",
        status: "sent",
        openedAt: new Date("2024-01-01T10:00:00Z"),
        clickedAt: new Date("2024-01-01T09:00:00Z"),
        submittedAt: null,
      },
    ]);

    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ id: "project-1" }),
    });
    const body = await response.json();
    const events = body.items[0].events;

    expect(events).toHaveLength(2);
    expect(events[0].type).toBe("CLICK");
    expect(events[1].type).toBe("OPEN");
  });
});
