import { describe, expect, it } from "vitest";
import { normalizeReturnTo } from "./Onboarding";

describe("Onboarding returnTo 정규화", () => {
  it("내부 경로는 그대로 유지한다", () => {
    expect(normalizeReturnTo("/projects?tab=list")).toBe("/projects?tab=list");
  });

  it("외부 URL은 루트로 fallback한다", () => {
    expect(normalizeReturnTo("https://evil.example")).toBe("/");
    expect(normalizeReturnTo("//evil.example")).toBe("/");
  });

  it("인증 API나 인코딩된 경로 우회 입력은 차단한다", () => {
    expect(normalizeReturnTo("/api/auth/logout")).toBe("/");
    expect(normalizeReturnTo("/%2f%2fevil.example")).toBe("/");
    expect(normalizeReturnTo("/foo%5cbar")).toBe("/");
  });
});
