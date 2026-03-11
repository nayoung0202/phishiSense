import { describe, expect, it } from "vitest";
import { formatCount, formatPercent, isRateDataKey } from "./Dashboard";

describe("Dashboard format helpers", () => {
  it("퍼센트 값을 정수로 반올림해 표시한다", () => {
    expect(formatPercent(33.3333)).toBe("33%");
    expect(formatPercent(66.6666)).toBe("67%");
    expect(formatPercent(0)).toBe("0%");
  });

  it("건수 값을 천 단위 구분 정수로 표시한다", () => {
    expect(formatCount(1200)).toBe("1,200");
    expect(formatCount(0)).toBe("0");
    expect(formatCount(null)).toBe("0");
  });

  it("퍼센트 시리즈 dataKey를 올바르게 판별한다", () => {
    expect(isRateDataKey("openRate")).toBe(true);
    expect(isRateDataKey("clickRate")).toBe(true);
    expect(isRateDataKey("submitRate")).toBe(true);
    expect(isRateDataKey("targetCount")).toBe(false);
    expect(isRateDataKey(undefined)).toBe(false);
  });
});
