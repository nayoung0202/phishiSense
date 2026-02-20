import { beforeEach, describe, expect, it, vi } from "vitest";

const storageMock = vi.hoisted(() => ({
  getSendJob: vi.fn(),
}));

vi.mock("@/server/storage", () => ({
  storage: storageMock,
}));

import { GET } from "./route";

const baseJob = {
  id: "job-1",
  projectId: "project-1",
  status: "queued",
  createdAt: new Date("2025-01-01T00:00:00Z"),
  startedAt: null,
  finishedAt: null,
  attempts: 0,
  lastError: null,
  totalCount: 3,
  successCount: 1,
  failCount: 0,
};

beforeEach(() => {
  storageMock.getSendJob.mockResolvedValue(baseJob);
});

describe("GET /api/send-jobs/[jobId]", () => {
  it("잡 상태를 반환한다", async () => {
    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ jobId: "job-1" }),
    });
    const body = await response.json();

    expect(body.id).toBe("job-1");
    expect(body.status).toBe("queued");
  });
});
