import { describe, expect, it } from "vitest";
import { neutralizePreviewModalHtml } from "@/lib/templatePreview";

describe("neutralizePreviewModalHtml", () => {
  it("dialog open 속성을 제거한다", () => {
    const html = '<section><dialog open class="modal-box">내용</dialog></section>';

    const result = neutralizePreviewModalHtml(html);

    expect(result).toContain('<dialog class="modal-box">내용</dialog>');
    expect(result).not.toContain("<dialog open");
  });

  it("다른 태그의 open 속성은 유지한다", () => {
    const html = "<details open><summary>제목</summary></details>";

    const result = neutralizePreviewModalHtml(html);

    expect(result).toBe(html);
  });

  it("빈 문자열이면 그대로 반환한다", () => {
    expect(neutralizePreviewModalHtml("")).toBe("");
  });
});
