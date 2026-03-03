import { describe, expect, it } from "vitest";
import type { Project } from "@shared/schema";
import {
  buildVisibleProjectsByMonth,
  compareProjectsBySchedule,
  findCalendarMonthIndex,
  resolveCalendarTargetMonthNumber,
} from "./Projects";

const buildProject = (
  id: string,
  name: string,
  startDate: string,
  endDate: string,
  status: string = "예약",
): Project =>
  ({
    id,
    name,
    description: "",
    department: "보안팀",
    departmentTags: ["보안팀"],
    templateId: null,
    trainingPageId: null,
    trainingLinkToken: null,
    sendingDomain: null,
    fromName: null,
    fromEmail: null,
    timezone: "Asia/Seoul",
    notificationEmails: [],
    startDate,
    endDate,
    status,
    targetCount: 0,
    openCount: 0,
    clickCount: 0,
    submitCount: 0,
    reportCaptureInboxFileKey: null,
    reportCaptureEmailFileKey: null,
    reportCaptureMaliciousFileKey: null,
    reportCaptureTrainingFileKey: null,
    sendValidationError: null,
    fiscalYear: 2025,
    fiscalQuarter: 1,
    weekOfYear: [1],
    createdAt: "2025-01-01T00:00:00.000Z",
  }) as unknown as Project;

describe("Projects sort helpers", () => {
  it("분기 전체(all)에서 수행 일정 오름차순을 유지한다", () => {
    const quarterProjects = [
      buildProject("p3", "세 번째", "2025-03-03T00:00:00.000Z", "2025-03-04T00:00:00.000Z"),
      buildProject("p1", "첫 번째", "2025-01-01T00:00:00.000Z", "2025-01-02T00:00:00.000Z"),
      buildProject("p2", "두 번째", "2025-02-01T00:00:00.000Z", "2025-02-02T00:00:00.000Z"),
    ];

    const sorted = buildVisibleProjectsByMonth(quarterProjects, Number.NaN);

    expect(sorted.map((project) => project.id)).toEqual(["p1", "p2", "p3"]);
  });

  it("월 선택 시 필터 후 동일 정렬 규칙을 적용한다", () => {
    const quarterProjects = [
      buildProject("p4", "4월-2", "2025-04-20T00:00:00.000Z", "2025-04-22T00:00:00.000Z"),
      buildProject("p2", "4월-1", "2025-04-03T00:00:00.000Z", "2025-04-04T00:00:00.000Z"),
      buildProject("p3", "5월", "2025-05-01T00:00:00.000Z", "2025-05-03T00:00:00.000Z"),
      buildProject("p1", "4월-0", "2025-04-01T00:00:00.000Z", "2025-04-01T00:00:00.000Z"),
    ];

    const aprilProjects = buildVisibleProjectsByMonth(quarterProjects, 4);

    expect(aprilProjects.map((project) => project.id)).toEqual(["p1", "p2", "p4"]);
  });

  it("보드 뷰에서도 같은 상태 컬럼 내 정렬 기준이 일관된다", () => {
    const scheduled = [
      buildProject("p3", "예정-뒤", "2025-04-10T00:00:00.000Z", "2025-04-11T00:00:00.000Z", "예약"),
      buildProject("p1", "예정-앞", "2025-04-01T00:00:00.000Z", "2025-04-02T00:00:00.000Z", "예약"),
      buildProject("p2", "예정-중간", "2025-04-05T00:00:00.000Z", "2025-04-06T00:00:00.000Z", "예약"),
    ];

    const sortedInStatus = [...scheduled].sort(compareProjectsBySchedule);

    expect(sortedInStatus.map((project) => project.id)).toEqual(["p1", "p2", "p3"]);
  });
});

describe("Projects calendar month sync helpers", () => {
  it("분기 전체(all)는 분기 시작 월 번호로 변환한다", () => {
    expect(resolveCalendarTargetMonthNumber("all", "Q1")).toBe(1);
    expect(resolveCalendarTargetMonthNumber("all", "Q2")).toBe(4);
    expect(resolveCalendarTargetMonthNumber("all", "Q3")).toBe(7);
    expect(resolveCalendarTargetMonthNumber("all", "Q4")).toBe(10);
  });

  it("월 값이 있으면 해당 월 번호를 유지하고, 비정상 값이면 분기 시작 월로 fallback한다", () => {
    expect(resolveCalendarTargetMonthNumber("2", "Q1")).toBe(2);
    expect(resolveCalendarTargetMonthNumber("invalid", "Q3")).toBe(7);
  });

  it("calendar months에서 대상 월 인덱스를 찾고 없으면 0을 반환한다", () => {
    const months = [
      { month: "2025-01-01T00:00:00.000Z", weeks: [] },
      { month: "2025-02-01T00:00:00.000Z", weeks: [] },
      { month: "2025-03-01T00:00:00.000Z", weeks: [] },
    ];

    expect(findCalendarMonthIndex(months, 2)).toBe(1);
    expect(findCalendarMonthIndex(months, 7)).toBe(0);
    expect(findCalendarMonthIndex([], 1)).toBe(0);
  });
});

