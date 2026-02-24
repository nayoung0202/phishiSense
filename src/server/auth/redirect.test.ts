import { afterEach, describe, expect, it } from "vitest";
import { buildReturnUrl, getAppOrigin, normalizeReturnTo } from "./redirect";

const ORIGINAL_NODE_ENV = process.env.NODE_ENV;
const ORIGINAL_APP_BASE_URL = process.env.APP_BASE_URL;
const ORIGINAL_PORT = process.env.PORT;

afterEach(() => {
  process.env.NODE_ENV = ORIGINAL_NODE_ENV;
  process.env.APP_BASE_URL = ORIGINAL_APP_BASE_URL;
  process.env.PORT = ORIGINAL_PORT;
});

describe("normalizeReturnTo", () => {
  it("상대 경로가 아니면 기본값으로 강제한다", () => {
    expect(normalizeReturnTo("javascript:alert(1)")).toBe("/");
  });

  it("프로토콜 상대 경로는 차단한다", () => {
    expect(normalizeReturnTo("//evil.com/path")).toBe("/");
  });

  it("백슬래시 포함 경로는 차단한다", () => {
    expect(normalizeReturnTo("/\\evil.com")).toBe("/");
  });

  it("인코딩된 구분자는 차단한다", () => {
    expect(normalizeReturnTo("%2F%2Fevil.com")).toBe("/");
    expect(normalizeReturnTo("%5C%5Cevil.com")).toBe("/");
  });

  it("정상 상대 경로는 유지한다", () => {
    expect(normalizeReturnTo("/projects?tab=list")).toBe("/projects?tab=list");
  });
});

describe("getAppOrigin", () => {
  it("운영에서 APP_BASE_URL이 없으면 오류를 발생시킨다", () => {
    process.env.NODE_ENV = "production";
    delete process.env.APP_BASE_URL;

    expect(() => getAppOrigin()).toThrow("[auth] 운영 환경에서는 APP_BASE_URL이 필요합니다.");
  });

  it("개발 환경에서는 PORT 기반 fallback을 사용한다", () => {
    process.env.NODE_ENV = "test";
    delete process.env.APP_BASE_URL;
    process.env.PORT = "5000";

    expect(getAppOrigin()).toBe("http://localhost:5000");
  });
});

describe("buildReturnUrl", () => {
  it("APP_BASE_URL origin을 기준으로 결합한다", () => {
    process.env.NODE_ENV = "test";
    process.env.APP_BASE_URL = "https://app.phishsense.cloud";

    expect(buildReturnUrl("/projects")).toBe("https://app.phishsense.cloud/projects");
  });
});
