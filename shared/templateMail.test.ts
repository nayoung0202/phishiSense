import { describe, expect, it } from "vitest";
import { buildMailHtml } from "./templateMail";

describe("buildMailHtml", () => {
  it("open pixel 토큰이 없어도 추적 픽셀을 자동 삽입한다", () => {
    const result = buildMailHtml(
      {
        body: '<p><a href="{{LANDING_URL}}">확인</a></p>',
        autoInsertLandingEnabled: true,
        autoInsertLandingLabel: "문서 확인하기",
        autoInsertLandingKind: "link",
        autoInsertLandingNewTab: true,
      },
      "https://example.com/p/token",
      "https://example.com/o/token",
    );

    expect(result.html).toContain('href="https://example.com/p/token"');
    expect(result.html).toContain('src="https://example.com/o/token"');
    expect(result.html.match(/<img /g)?.length ?? 0).toBe(1);
  });

  it("open pixel 토큰이 있으면 중복 삽입하지 않는다", () => {
    const result = buildMailHtml(
      {
        body: '<p><a href="{{LANDING_URL}}">확인</a></p><img src="{{OPEN_PIXEL_URL}}" alt="" />',
        autoInsertLandingEnabled: true,
        autoInsertLandingLabel: "문서 확인하기",
        autoInsertLandingKind: "link",
        autoInsertLandingNewTab: true,
      },
      "https://example.com/p/token",
      "https://example.com/o/token",
    );

    expect(result.html.match(/https:\/\/example\.com\/o\/token/g)?.length ?? 0).toBe(1);
  });
});
