import { describe, expect, it } from "vitest";
import {
  canCompareSelectedProjects,
  canCopySelectedProjects,
  canStartSelectedProjects,
  canStopSelectedProjects,
} from "./projectSelectionPolicy";

describe("projectSelectionPolicy", () => {
  it("비교 미리보기는 2개 이상 선택되어야 가능하다", () => {
    expect(canCompareSelectedProjects(0)).toBe(false);
    expect(canCompareSelectedProjects(1)).toBe(false);
    expect(canCompareSelectedProjects(2)).toBe(true);
    expect(canCompareSelectedProjects(3)).toBe(true);
  });

  it("복제는 정확히 1개 선택되었을 때만 가능하다", () => {
    expect(canCopySelectedProjects(0)).toBe(false);
    expect(canCopySelectedProjects(1)).toBe(true);
    expect(canCopySelectedProjects(2)).toBe(false);
    expect(canCopySelectedProjects(3)).toBe(false);
  });

  it("전체 시작은 선택된 프로젝트가 모두 임시 또는 예약일 때만 가능하다", () => {
    expect(canStartSelectedProjects([])).toBe(false);
    expect(canStartSelectedProjects(["임시"])).toBe(true);
    expect(canStartSelectedProjects(["예약", "임시"])).toBe(true);
    expect(canStartSelectedProjects(["진행중"])).toBe(false);
    expect(canStartSelectedProjects(["예약", "완료"])).toBe(false);
  });

  it("전체 중지는 선택된 프로젝트가 모두 예약 또는 진행중일 때만 가능하다", () => {
    expect(canStopSelectedProjects([])).toBe(false);
    expect(canStopSelectedProjects(["예약"])).toBe(true);
    expect(canStopSelectedProjects(["진행중", "예약"])).toBe(true);
    expect(canStopSelectedProjects(["임시"])).toBe(false);
    expect(canStopSelectedProjects(["진행중", "완료"])).toBe(false);
  });
});
