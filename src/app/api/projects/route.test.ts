import { beforeEach, describe, expect, it, vi } from "vitest";

const storageMock = vi.hoisted(() => ({
  getProjects: vi.fn(),
}));

vi.mock("@/server/storage", () => ({
  storage: storageMock,
}));

import { GET } from "./route";

const buildProject = (
  id: string,
  name: string,
  startDate: string,
  endDate: string,
  status: string = "예약",
) => ({
  id,
  name,
  description: "",
  department: "보안팀",
  departmentTags: ["보안팀"],
  templateId: null,
  trainingPageId: null,
  trainingLinkToken: null,
  sendingDomain: null,
  fromName: null,
  fromEmail: null,
  timezone: "Asia/Seoul",
  notificationEmails: [],
  startDate,
  endDate,
  status,
  targetCount: 0,
  openCount: 0,
  clickCount: 0,
  submitCount: 0,
  reportCaptureInboxFileKey: null,
  reportCaptureEmailFileKey: null,
  reportCaptureMaliciousFileKey: null,
  reportCaptureTrainingFileKey: null,
  sendValidationError: null,
  fiscalYear: 2025,
  fiscalQuarter: 1,
  weekOfYear: [1],
  createdAt: new Date("2025-01-01T00:00:00.000Z"),
});

describe("GET /api/projects sorting", () => {
  beforeEach(() => {
    storageMock.getProjects.mockReset();
  });

  it("분기 조회 시 수행 일정(startDate) 오름차순으로 정렬한다", async () => {
    storageMock.getProjects.mockResolvedValue([
      buildProject("p3", "세 번째", "2025-03-10T00:00:00.000Z", "2025-03-12T00:00:00.000Z"),
      buildProject("p1", "첫 번째", "2025-01-02T00:00:00.000Z", "2025-01-04T00:00:00.000Z"),
      buildProject("p2", "두 번째", "2025-02-01T00:00:00.000Z", "2025-02-03T00:00:00.000Z"),
    ]);

    const response = await GET(
      new Request("http://localhost/api/projects?year=2025&quarter=1") as never,
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.map((project: { id: string }) => project.id)).toEqual(["p1", "p2", "p3"]);
  });

  it("같은 시작일이면 종료일, 이름 순서로 정렬한다", async () => {
    storageMock.getProjects.mockResolvedValue([
      buildProject("p3", "다", "2025-01-01T00:00:00.000Z", "2025-01-05T00:00:00.000Z"),
      buildProject("p2", "가", "2025-01-01T00:00:00.000Z", "2025-01-02T00:00:00.000Z"),
      buildProject("p1", "나", "2025-01-01T00:00:00.000Z", "2025-01-02T00:00:00.000Z"),
    ]);

    const response = await GET(
      new Request("http://localhost/api/projects?year=2025&quarter=1") as never,
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.map((project: { id: string }) => project.id)).toEqual(["p2", "p1", "p3"]);
  });

  it("잘못된 날짜 항목은 목록의 뒤로 정렬한다", async () => {
    storageMock.getProjects.mockResolvedValue([
      buildProject("p2", "유효-뒤", "2025-01-02T00:00:00.000Z", "2025-01-03T00:00:00.000Z"),
      buildProject("p3", "비정상", "invalid-date", "invalid-date"),
      buildProject("p1", "유효-앞", "2025-01-01T00:00:00.000Z", "2025-01-01T00:00:00.000Z"),
    ]);

    const response = await GET(
      new Request("http://localhost/api/projects") as never,
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.map((project: { id: string }) => project.id)).toEqual(["p1", "p2", "p3"]);
  });
});

