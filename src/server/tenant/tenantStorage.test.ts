import { beforeEach, describe, expect, it, vi } from "vitest";
import { TENANT_A_ID, buildProjectFixture, buildProjectTargetFixture } from "@/test/tenantFixtures";

const projectDaoMock = vi.hoisted(() => ({
  createProjectRecord: vi.fn(),
  deleteProjectByIdForTenant: vi.fn(),
  getProjectByIdForTenant: vi.fn(),
  getProjectByTrainingLinkToken: vi.fn(),
  listProjectsByIdsForTenant: vi.fn(),
  listProjectsForTenant: vi.fn(),
  updateProjectByIdForTenant: vi.fn(),
}));

const projectTargetDaoMock = vi.hoisted(() => ({
  createProjectTargetRecord: vi.fn(),
  deleteProjectTargetsByIdsForTenant: vi.fn(),
  getProjectTargetByTrackingToken: vi.fn(),
  listProjectTargetsForTenant: vi.fn(),
  updateProjectTargetByIdForTenant: vi.fn(),
}));

vi.mock("@/server/dao/projectDao", () => projectDaoMock);
vi.mock("@/server/dao/projectTargetDao", () => projectTargetDaoMock);
vi.mock("@/server/lib/trainingLink", () => ({
  generateTrainingLinkToken: vi.fn(() => "copied-training-token"),
}));

vi.mock("@/server/dao/templateDao", () => ({}));
vi.mock("@/server/dao/targetDao", () => ({}));
vi.mock("@/server/dao/trainingPageDao", () => ({}));
vi.mock("@/server/dao/sendJobDao", () => ({}));
vi.mock("@/server/dao/reportTemplateDao", () => ({}));
vi.mock("@/server/dao/reportSettingDao", () => ({}));
vi.mock("@/server/dao/smtpDao", () => ({}));
vi.mock("@/server/dao/reportInstanceDao", () => ({}));
vi.mock("@/server/services/sendJobsCore", () => ({
  enqueueSendJobForProjectCore: vi.fn(),
}));

import { copyProjectsForTenant } from "./tenantStorage";

describe("copyProjectsForTenant", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("원본이 예약 상태여도 복제본은 임시 상태와 초기 집계값으로 생성한다", async () => {
    const originalProject = buildProjectFixture({
      id: "project-1",
      tenantId: TENANT_A_ID,
      name: "분기 훈련",
      status: "예약",
      openCount: 12,
      clickCount: 5,
      submitCount: 2,
    });
    const originalTarget = buildProjectTargetFixture({
      id: "pt-1",
      tenantId: TENANT_A_ID,
      projectId: originalProject.id,
      targetId: "target-1",
    });

    projectDaoMock.listProjectsForTenant.mockResolvedValue([originalProject]);
    projectDaoMock.listProjectsByIdsForTenant.mockResolvedValue([originalProject]);
    projectDaoMock.getProjectByTrainingLinkToken.mockResolvedValue(null);
    projectTargetDaoMock.listProjectTargetsForTenant.mockResolvedValue([originalTarget]);
    projectDaoMock.createProjectRecord.mockImplementation(async (payload) => payload);
    projectTargetDaoMock.createProjectTargetRecord.mockResolvedValue(originalTarget);

    const [copiedProject] = await copyProjectsForTenant(TENANT_A_ID, [originalProject.id]);

    expect(projectDaoMock.createProjectRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "분기 훈련 복제",
        status: "임시",
        openCount: 0,
        clickCount: 0,
        submitCount: 0,
        sendValidationError: null,
      }),
    );
    expect(copiedProject).toMatchObject({
      name: "분기 훈련 복제",
      status: "임시",
      openCount: 0,
      clickCount: 0,
      submitCount: 0,
    });
    expect(projectTargetDaoMock.createProjectTargetRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: copiedProject.id,
        targetId: originalTarget.targetId,
      }),
    );
  });
});
