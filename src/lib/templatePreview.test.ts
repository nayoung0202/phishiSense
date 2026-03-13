import { describe, expect, it } from "vitest";
import {
  neutralizePreviewModalHtml,
  TEMPLATE_PREVIEW_SANDBOX_CSS,
} from "@/lib/templatePreview";

describe("neutralizePreviewModalHtml", () => {
  it("최상위 고정 레이어 래퍼는 제거하고 내부 카드만 남긴다", () => {
    const html =
      '<div style="position:fixed;inset:0;display:flex"><section class="card">내용</section></div>';

    const result = neutralizePreviewModalHtml(html);

    expect(result).toBe('<section class="card">내용</section>');
  });

  it("dialog 태그는 정적 div 컨테이너로 바꾼다", () => {
    const html = '<section><dialog open class="modal-box">내용</dialog></section>';

    const result = neutralizePreviewModalHtml(html);

    expect(result).toBe(
      '<section><div data-preview-dialog="true" class="modal-box">내용</div></section>',
    );
  });

  it("details open 속성은 유지한다", () => {
    const html = "<details open><summary>제목</summary></details>";

    expect(neutralizePreviewModalHtml(html)).toBe(html);
  });

  it("빈 문자열이면 빈 문자열을 반환한다", () => {
    expect(neutralizePreviewModalHtml("")).toBe("");
  });
});

describe("TEMPLATE_PREVIEW_SANDBOX_CSS", () => {
  it("직계 고정 레이어를 display: contents로 평탄화한다", () => {
    expect(TEMPLATE_PREVIEW_SANDBOX_CSS).toContain("display: contents !important;");
    expect(TEMPLATE_PREVIEW_SANDBOX_CSS).toContain("> :is([style*=\"position:fixed\"]");
  });
});
