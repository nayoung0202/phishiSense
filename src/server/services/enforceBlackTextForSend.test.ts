import { describe, expect, it } from "vitest";
import { enforceBlackTextForSend } from "./enforceBlackTextForSend";

describe("enforceBlackTextForSend", () => {
  it("인라인 style의 white 텍스트를 검정으로 치환한다", () => {
    const input = '<p style="color:#fff; font-size:14px;">본문</p>';

    const result = enforceBlackTextForSend(input);

    expect(result).toContain('style="color: #111111; font-size: 14px"');
    expect(result).not.toContain("color:#fff");
  });

  it("color 속성 white 값을 검정으로 치환한다", () => {
    const input = '<font color="white">알림</font>';

    const result = enforceBlackTextForSend(input);

    expect(result).toContain('color="#111111"');
    expect(result).not.toContain('color="white"');
  });

  it("style 블록의 white 텍스트 선언을 검정으로 치환한다", () => {
    const input = '<style>.title{color:white !important;} .card{background-color:#ffffff;}</style><h1 class="title">제목</h1>';

    const result = enforceBlackTextForSend(input);

    expect(result).toContain(".title{color: #111111 !important;}");
    expect(result).toContain("background-color:#ffffff");
  });

  it("white가 아닌 색상은 유지한다", () => {
    const input = '<p style="color:#2563eb;">링크</p>';

    const result = enforceBlackTextForSend(input);

    expect(result).toContain('style="color: #2563eb"');
  });
});
