import { beforeEach, describe, expect, it, vi } from "vitest";

const storageMock = vi.hoisted(() => ({
  getProject: vi.fn(),
  getTemplate: vi.fn(),
  getTrainingPage: vi.fn(),
  updateProject: vi.fn(),
  findActiveSendJobByProjectId: vi.fn(),
  getProjectTargets: vi.fn(),
  updateProjectTarget: vi.fn(),
  createSendJob: vi.fn(),
}));

vi.mock("@/server/storage", () => ({
  storage: storageMock,
}));

import { POST } from "./route";

const baseProject = {
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

const baseTemplate = {
  id: "template-1",
  name: "테스트 템플릿",
  subject: "테스트 제목",
  body: '<p>메일 본문 <a href="{{LANDING_URL}}">확인</a></p>',
  maliciousPageContent: '<p><a href="{{TRAINING_URL}}">훈련 안내</a></p>',
  autoInsertLandingEnabled: true,
  autoInsertLandingLabel: "문서 확인하기",
  autoInsertLandingKind: "link",
  autoInsertLandingNewTab: true,
  createdAt: new Date("2024-12-31T00:00:00Z"),
  updatedAt: new Date("2024-12-31T00:00:00Z"),
};

const baseTrainingPage = {
  id: "page-1",
  name: "훈련 안내",
  description: null,
  content: "<p>훈련 안내</p>",
  status: "active",
  createdAt: new Date("2024-12-31T00:00:00Z"),
  updatedAt: new Date("2024-12-31T00:00:00Z"),
};

beforeEach(() => {
  storageMock.getProject.mockResolvedValue(baseProject);
  storageMock.getTemplate.mockResolvedValue(baseTemplate);
  storageMock.getTrainingPage.mockResolvedValue(baseTrainingPage);
  storageMock.updateProject.mockResolvedValue(baseProject);
  storageMock.getProjectTargets.mockResolvedValue([]);
  storageMock.updateProjectTarget.mockResolvedValue(null);
  storageMock.createSendJob.mockResolvedValue({
    id: "job-1",
    projectId: "project-1",
    status: "queued",
  });
});

describe("POST /api/projects/[id]/send", () => {
  it("활성 잡이 있으면 새로 만들지 않고 기존 잡을 반환한다", async () => {
    const existingJob = {
      id: "job-99",
      projectId: "project-1",
      status: "queued",
    };
    storageMock.findActiveSendJobByProjectId.mockResolvedValue(existingJob);

    const response = await POST(new Request("http://localhost"), {
      params: Promise.resolve({ id: "project-1" }),
    });
    const body = await response.json();

    expect(body.id).toBe("job-99");
    expect(storageMock.createSendJob).not.toHaveBeenCalled();
  });
});
