import { describe, expect, it } from "vitest";
import {
  renderEmailForSend,
  stripDarkThemeStyles,
} from "@/lib/email/renderEmailForSend";

const WHITE_TEXT_DECLARATION_PATTERN = /(^|[^-])color\s*:\s*(#fff|#ffffff|white)\b/i;

describe("stripDarkThemeStyles", () => {
  it("인라인 white 텍스트와 black 배경 스타일을 제거한다", () => {
    const input =
      '<div style="color:#fff; background-color:#000; font-size:14px;">본문</div>';

    const result = stripDarkThemeStyles(input);

    expect(result).toContain('style="font-size: 14px"');
    expect(result).not.toMatch(WHITE_TEXT_DECLARATION_PATTERN);
    expect(result).not.toMatch(/background(?:-color)?\s*:\s*(#000|#111111|black)/i);
  });

  it("dark 관련 class와 data-theme 속성을 제거한다", () => {
    const input =
      '<section data-theme="dark" class="content dark dark:bg-black text-white theme-dark keep">내용</section>';

    const result = stripDarkThemeStyles(input);

    expect(result).toContain('class="content keep"');
    expect(result).not.toContain('data-theme="dark"');
    expect(result).not.toContain("text-white");
  });

  it("transparent 배경 + white 텍스트 조합에서 white 텍스트를 제거한다", () => {
    const input = '<p style="background-color: transparent; color: white;">안내</p>';

    const result = stripDarkThemeStyles(input);

    expect(result).toContain('style="background-color: transparent"');
    expect(result).not.toMatch(WHITE_TEXT_DECLARATION_PATTERN);
  });

  it("제거 후 style이 비면 style 속성도 제거한다", () => {
    const input = '<span style="color:#ffffff; background:#000;">텍스트</span>';

    const result = stripDarkThemeStyles(input);

    expect(result).toBe("<span>텍스트</span>");
  });
});

describe("renderEmailForSend", () => {
  it("full html 문서로 래핑하고 white 텍스트를 남기지 않는다", () => {
    const fragment =
      '<a class="btn" style="background:#2563eb;color:#fff;padding:12px 18px;">버튼</a><a href="https://example.com">링크</a>';

    const result = renderEmailForSend(fragment, { subject: "테스트 제목" });

    expect(result).toMatch(/^<!doctype html>/i);
    expect(result).toContain("<html");
    expect(result).toContain("<body");
    expect(result).not.toMatch(WHITE_TEXT_DECLARATION_PATTERN);
    expect(result).toContain("color: #111111");
    expect(result).toContain("color: #1a73e8");
  });
});
