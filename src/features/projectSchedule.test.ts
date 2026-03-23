import { describe, expect, it } from "vitest";
import {
  applyTimeToDate,
  formatTimeInputValue,
  getDefaultProjectStartDate,
  isFutureScheduledDateTime,
  isPastProjectDate,
  preserveTimeOnDateChange,
  resolveProjectStartDate,
} from "./projectSchedule";

describe("projectSchedule helpers", () => {
  it("기본 시작 시각은 현재 시각 기준으로 초와 밀리초를 제거한다", () => {
    const result = getDefaultProjectStartDate(new Date("2026-03-18T09:12:34.567+09:00"));

    expect(result.toISOString()).toBe("2026-03-18T00:12:00.000Z");
  });

  it("과거 날짜만 선택 불가로 판단하고 오늘 날짜는 허용한다", () => {
    const now = new Date("2026-03-18T09:00:00+09:00");

    expect(isPastProjectDate(new Date("2026-03-17T23:59:00+09:00"), now)).toBe(true);
    expect(isPastProjectDate(new Date("2026-03-18T00:00:00+09:00"), now)).toBe(false);
  });

  it("날짜를 바꿀 때 기존 시각을 유지한다", () => {
    const source = new Date("2026-03-18T14:25:00+09:00");
    const selected = new Date("2026-03-21T00:00:00+09:00");

    const result = preserveTimeOnDateChange(selected, source);

    expect(formatTimeInputValue(result)).toBe("14:25");
    expect(result.getDate()).toBe(21);
  });

  it("시간 입력을 날짜에 반영한다", () => {
    const result = applyTimeToDate(new Date("2026-03-18T00:00:00+09:00"), "16:45");

    expect(formatTimeInputValue(result)).toBe("16:45");
  });

  it("예약 생성은 미래 시각만 허용한다", () => {
    const now = new Date("2026-03-18T09:00:00+09:00");

    expect(isFutureScheduledDateTime(new Date("2026-03-18T08:59:00+09:00"), now)).toBe(false);
    expect(isFutureScheduledDateTime(new Date("2026-03-18T09:30:00+09:00"), now)).toBe(true);
  });

  it("선택한 시작 시각이 있으면 그대로 사용한다", () => {
    const selected = new Date("2026-03-18T15:45:00+09:00");
    const now = new Date("2026-03-18T09:00:00+09:00");

    const result = resolveProjectStartDate(selected, now);

    expect(result).toBe(selected);
    expect(result.toISOString()).toBe("2026-03-18T06:45:00.000Z");
  });

  it("선택한 시작 시각이 없으면 현재 시각을 기본값으로 사용한다", () => {
    const now = new Date("2026-03-18T09:12:34.567+09:00");

    const result = resolveProjectStartDate(undefined, now);

    expect(result.toISOString()).toBe("2026-03-18T00:12:00.000Z");
  });
});
