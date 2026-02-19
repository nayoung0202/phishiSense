import { describe, expect, it } from "vitest";
import { neutralizePreviewModalHtml } from "@/lib/templatePreview";

describe("neutralizePreviewModalHtml", () => {
  it("입력 HTML을 그대로 반환한다", () => {
    const html = '<section><dialog open class="modal-box">내용</dialog></section>';

    const result = neutralizePreviewModalHtml(html);

    expect(result).toBe(html);
  });

  it("details open 속성도 유지한다", () => {
    const html = "<details open><summary>제목</summary></details>";

    const result = neutralizePreviewModalHtml(html);

    expect(result).toBe(html);
  });

  it("빈 문자열이면 빈 문자열을 반환한다", () => {
    expect(neutralizePreviewModalHtml("")).toBe("");
  });
});
