import { describe, expect, it, vi } from "vitest";
import type { ProjectTarget, SendJob } from "@shared/schema";
import { enqueueSendJobForProjectCore } from "./sendJobsCore";

const baseProjectTarget = (overrides: Partial<ProjectTarget>): ProjectTarget => ({
  id: "pt-1",
  projectId: "project-1",
  targetId: "target-1",
  trackingToken: null,
  status: "sent",
  sendStatus: "pending",
  sentAt: null,
  sendError: null,
  openedAt: null,
  clickedAt: null,
  submittedAt: null,
  ...overrides,
});

const baseSendJob = (overrides: Partial<SendJob>): SendJob => ({
  id: "job-1",
  projectId: "project-1",
  status: "queued",
  createdAt: new Date(),
  startedAt: null,
  finishedAt: null,
  attempts: 0,
  lastError: null,
  totalCount: 0,
  successCount: 0,
  failCount: 0,
  ...overrides,
});

describe("enqueueSendJobForProjectCore", () => {
  it("프로젝트 대상자 기준으로 발송 잡을 생성한다", async () => {
    const projectTargets = [
      baseProjectTarget({ id: "pt-1", trackingToken: null, sendStatus: "pending" }),
      baseProjectTarget({ id: "pt-2", trackingToken: "token-2", sendStatus: "sent" }),
      baseProjectTarget({ id: "pt-3", status: "test", sendStatus: "pending" }),
    ];
    const updateProjectTarget = vi.fn().mockResolvedValue(projectTargets[0]);
    const createSendJob = vi.fn().mockResolvedValue(
      baseSendJob({ totalCount: 1, projectId: "project-1" }),
    );
    const storage = {
      findActiveSendJobByProjectId: vi.fn().mockResolvedValue(undefined),
      getProjectTargets: vi.fn().mockResolvedValue(projectTargets),
      updateProjectTarget,
      createSendJob,
    };

    const result = await enqueueSendJobForProjectCore(storage, "project-1");

    expect(result.created).toBe(true);
    expect(updateProjectTarget).toHaveBeenCalledTimes(1);
    expect(updateProjectTarget).toHaveBeenCalledWith(
      "pt-1",
      expect.objectContaining({ trackingToken: expect.any(String) }),
    );
    expect(createSendJob).toHaveBeenCalledWith(
      expect.objectContaining({ projectId: "project-1", totalCount: 1 }),
    );
  });

  it("활성 발송 잡이 있으면 새로 생성하지 않는다", async () => {
    const existingJob = baseSendJob({ id: "job-2", status: "running" });
    const storage = {
      findActiveSendJobByProjectId: vi.fn().mockResolvedValue(existingJob),
      getProjectTargets: vi.fn(),
      updateProjectTarget: vi.fn(),
      createSendJob: vi.fn(),
    };

    const result = await enqueueSendJobForProjectCore(storage, "project-1");

    expect(result.created).toBe(false);
    expect(result.job).toBe(existingJob);
    expect(storage.createSendJob).not.toHaveBeenCalled();
  });
});
