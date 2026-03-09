import { beforeEach, describe, expect, it, vi } from "vitest";

const storageMock = vi.hoisted(() => ({
  findTargetByEmail: vi.fn(),
  createTarget: vi.fn(),
}));

vi.mock("@/server/storage", () => ({
  storage: storageMock,
}));

import { POST } from "./route";

describe("POST /api/targets", () => {
  beforeEach(() => {
    storageMock.findTargetByEmail.mockReset();
    storageMock.createTarget.mockReset();
  });

  it("중복 이메일이면 409를 반환한다", async () => {
    storageMock.findTargetByEmail.mockResolvedValue({
      id: "target-1",
      email: "dup@example.com",
    });

    const response = await POST(
      new Request("http://localhost/api/targets", {
        method: "POST",
        body: JSON.stringify({
          name: "중복 대상",
          email: "dup@example.com",
          department: "보안팀",
          status: "active",
        }),
      }),
    );

    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error).toBe("duplicate_email");
  });
});
