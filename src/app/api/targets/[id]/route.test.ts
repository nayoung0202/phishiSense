import { beforeEach, describe, expect, it, vi } from "vitest";

const storageMock = vi.hoisted(() => ({
  findTargetByEmail: vi.fn(),
  updateTarget: vi.fn(),
}));

vi.mock("@/server/storage", () => ({
  storage: storageMock,
}));

import { PATCH } from "./route";

describe("PATCH /api/targets/[id]", () => {
  beforeEach(() => {
    storageMock.findTargetByEmail.mockReset();
    storageMock.updateTarget.mockReset();
  });

  it("다른 대상과 이메일이 충돌하면 409를 반환한다", async () => {
    storageMock.findTargetByEmail.mockResolvedValue({
      id: "target-2",
      email: "dup@example.com",
    });

    const response = await PATCH(
      new Request("http://localhost/api/targets/target-1", {
        method: "PATCH",
        body: JSON.stringify({
          email: "dup@example.com",
        }),
      }) as never,
      {
        params: Promise.resolve({ id: "target-1" }),
      },
    );

    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error).toBe("duplicate_email");
  });
});
