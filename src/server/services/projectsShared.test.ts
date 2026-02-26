import { describe, expect, it } from "vitest";
import type { Project } from "../../../shared/schema";
import {
  collectDepartmentTagsFromTargets,
  shouldCompleteProject,
  shouldStartScheduledProject,
  splitDepartmentEntries,
} from "./projectsShared";

const baseProject: Project = {
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
  status: "예약",
  targetCount: 0,
  openCount: 0,
  clickCount: 0,
  submitCount: 0,
  sendValidationError: null,
  fiscalYear: null,
  fiscalQuarter: null,
  weekOfYear: [],
  createdAt: new Date("2024-12-31T00:00:00Z"),
};

const buildProject = (overrides: Partial<Project> = {}): Project => ({
  ...baseProject,
  ...overrides,
});

describe("shouldStartScheduledProject", () => {
  it("예약 상태이고 시작 시간이 지났으면 true를 반환한다", () => {
    const now = new Date("2025-01-02T09:00:00Z");
    const project = buildProject({
      status: "예약",
      startDate: new Date("2025-01-02T08:00:00Z"),
    });

    expect(shouldStartScheduledProject(project, now)).toBe(true);
  });

  it("예약 상태지만 시작 시간이 미래면 false를 반환한다", () => {
    const now = new Date("2025-01-02T09:00:00Z");
    const project = buildProject({
      status: "예약",
      startDate: new Date("2025-01-02T10:00:00Z"),
    });

    expect(shouldStartScheduledProject(project, now)).toBe(false);
  });

  it("예약 상태가 아니면 false를 반환한다", () => {
    const now = new Date("2025-01-02T09:00:00Z");
    const project = buildProject({
      status: "진행중",
      startDate: new Date("2025-01-02T08:00:00Z"),
    });

    expect(shouldStartScheduledProject(project, now)).toBe(false);
  });
});

describe("shouldCompleteProject", () => {
  it("종료 시간이 지났고 완료 상태가 아니면 true를 반환한다", () => {
    const now = new Date("2025-01-03T09:00:00Z");
    const project = buildProject({
      status: "진행중",
      endDate: new Date("2025-01-03T08:00:00Z"),
    });

    expect(shouldCompleteProject(project, now)).toBe(true);
  });

  it("임시 상태면 false를 반환한다", () => {
    const now = new Date("2025-01-03T09:00:00Z");
    const project = buildProject({
      status: "임시",
      endDate: new Date("2025-01-03T08:00:00Z"),
    });

    expect(shouldCompleteProject(project, now)).toBe(false);
  });
});

describe("splitDepartmentEntries", () => {
  it("콤마로 구분된 부서를 배열로 분리한다", () => {
    expect(splitDepartmentEntries("영업본부, 개발본부 1팀, 인사팀")).toEqual([
      "영업본부",
      "개발본부 1팀",
      "인사팀",
    ]);
  });

  it("문자열이 아니면 빈 배열을 반환한다", () => {
    expect(splitDepartmentEntries(null)).toEqual([]);
    expect(splitDepartmentEntries(undefined)).toEqual([]);
  });
});

describe("collectDepartmentTagsFromTargets", () => {
  it("대상 목록에서 부서 태그를 중복 제거하여 정렬한다", () => {
    const tags = collectDepartmentTagsFromTargets([
      { department: "영업본부, 플랫폼팀" },
      { department: "플랫폼팀" },
      { department: "인사팀" },
    ]);

    expect(tags).toEqual(["영업본부", "인사팀", "플랫폼팀"]);
  });
});
