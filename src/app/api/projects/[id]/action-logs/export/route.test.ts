import { beforeEach, describe, expect, it, vi } from "vitest";

const { storageMock } = vi.hoisted(() => ({
  storageMock: {
    getProject: vi.fn(),
    getProjectTargets: vi.fn(),
    getTargets: vi.fn(),
  },
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
  notificationEmails: [],
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

describe("GET /api/projects/[id]/action-logs/export", () => {
  it("프로젝트가 없으면 404를 반환한다", async () => {
    storageMock.getProject.mockResolvedValueOnce(undefined);

    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ id: "missing-project" }),
    });

    expect(response.status).toBe(404);
  });

  it("타임라인 이벤트를 xlsx 파일로 반환한다", async () => {
    storageMock.getProjectTargets.mockResolvedValue([
      {
        id: "pt-1",
        projectId: "project-1",
        targetId: "target-1",
        trackingToken: "track-1",
        status: "sent",
        sentAt: new Date("2025-01-01T08:00:00Z"),
        openedAt: new Date("2025-01-01T09:00:00Z"),
        clickedAt: new Date("2025-01-01T10:00:00Z"),
        submittedAt: null,
      },
    ]);

    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ id: "project-1" }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    expect(response.headers.get("Content-Disposition")).toContain(".xlsx");

    const buffer = new Uint8Array(await response.arrayBuffer());
    expect(buffer.length).toBeGreaterThan(0);
    expect(buffer[0]).toBe(0x50);
    expect(buffer[1]).toBe(0x4b);
  });
});
