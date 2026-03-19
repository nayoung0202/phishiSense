import { describe, expect, it } from "vitest";
import { shouldAutoOpenConflictDialog } from "./projectConflictPolicy";

describe("shouldAutoOpenConflictDialog", () => {
  it("충돌이 없으면 자동으로 열지 않는다", () => {
    expect(
      shouldAutoOpenConflictDialog({
        hasConflicts: false,
        hasShownConflictDialog: false,
      }),
    ).toBe(false);
  });

  it("충돌이 처음 감지되면 자동으로 연다", () => {
    expect(
      shouldAutoOpenConflictDialog({
        hasConflicts: true,
        hasShownConflictDialog: false,
      }),
    ).toBe(true);
  });

  it("이미 한 번 보여준 뒤에는 다시 자동으로 열지 않는다", () => {
    expect(
      shouldAutoOpenConflictDialog({
        hasConflicts: true,
        hasShownConflictDialog: true,
      }),
    ).toBe(false);
  });
});
