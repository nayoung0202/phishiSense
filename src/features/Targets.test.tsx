import { describe, expect, it } from "vitest";
import type { Target } from "@shared/schema";
import {
  filterTargetsBySearch,
  isNumericOnlyQuery,
  normalizeTargetSearchValue,
  tokenizeTargetSearch,
} from "./Targets";

const makeTarget = (
  id: string,
  name: string,
  email: string,
  department: string,
  tags: string[] = [],
): Target =>
  ({
    id,
    name,
    email,
    department,
    tags,
    status: "active",
    createdAt: new Date().toISOString(),
  }) as unknown as Target;

describe("Targets 검색 유틸", () => {
  const targets: Target[] = [
    makeTarget("t1", "employee1", "kim1@company.com", "hq security team1", ["training2026"]),
    makeTarget("t2", "lee-ops", "lee2@company.com", "hq ops team2"),
    makeTarget("t3", "employee10", "park3@dev.com", "dev platform"),
    makeTarget("t4", "admin", "admin2026@company.com", "hq audit", ["policy2026"]),
  ];

  it("검색어 정규화 시 공백을 1칸으로 축약한다", () => {
    expect(normalizeTargetSearchValue("  KIM   SECURITY  ")).toBe("kim security");
  });

  it("검색어를 공백 기준 토큰 배열로 분리한다", () => {
    expect(tokenizeTargetSearch("  kim   security  ")).toEqual(["kim", "security"]);
  });

  it("숫자-only 검색어를 감지한다", () => {
    expect(isNumericOnlyQuery(["2026"])).toBe(true);
    expect(isNumericOnlyQuery(["2026", "10"])).toBe(true);
    expect(isNumericOnlyQuery(["2026", "security"])).toBe(false);
  });

  it("이름 일부 검색이 동작한다", () => {
    const result = filterTargetsBySearch(targets, "kim");
    expect(result.map((target) => target.id)).toEqual(["t1"]);
  });

  it("다중 단어 AND 검색이 동작한다", () => {
    const result = filterTargetsBySearch(targets, "kim team1");
    expect(result.map((target) => target.id)).toEqual(["t1"]);
  });

  it("이메일과 소속 교차 검색이 동작한다", () => {
    const result = filterTargetsBySearch(targets, "company.com team1");
    expect(result.map((target) => target.id)).toEqual(["t1"]);
  });

  it("숫자-only 검색은 이름에 숫자가 없으면 매칭되지 않는다", () => {
    const result = filterTargetsBySearch(targets, "2026");
    expect(result.map((target) => target.id)).toEqual([]);
  });

  it("숫자-only 검색은 이름 숫자 기준으로만 매칭된다", () => {
    const result = filterTargetsBySearch(targets, "1");
    expect(result.map((target) => target.id)).toEqual(["t1", "t3"]);
  });

  it("숫자+문자 혼합 검색은 기존 전체 범위 AND를 유지한다", () => {
    const result = filterTargetsBySearch(targets, "2026 company.com");
    expect(result.map((target) => target.id)).toEqual(["t4"]);
  });

  it("빈 검색어면 전체 대상을 반환한다", () => {
    const result = filterTargetsBySearch(targets, "   ");
    expect(result.map((target) => target.id)).toEqual(["t1", "t2", "t3", "t4"]);
  });
});
