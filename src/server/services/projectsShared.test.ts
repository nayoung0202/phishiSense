import { describe, expect, it } from "vitest";
import type { Project } from "../../../shared/schema";
import { shouldStartScheduledProject } from "./projectsShared";

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
