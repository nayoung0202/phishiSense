import React from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { TemplatePreviewFrame } from "./template-preview-frame";

describe("TemplatePreviewFrame", () => {
  const getShadowHtml = (el: HTMLElement) => el.shadowRoot?.innerHTML ?? "";

  it("기본 미리보기에서는 호스트와 내부 요소 모두 상호작용이 차단된다", () => {
    render(
      <TemplatePreviewFrame
        html={'<form action="/submit"><a href="/landing">이동</a><button type="submit">제출</button></form>'}
      />,
    );

    const host = screen.getByTitle("template-preview-frame");
    expect(host).toHaveClass("pointer-events-none");
    expect(host).toHaveAttribute("tabindex", "-1");
    expect(getShadowHtml(host)).toContain("pointer-events: none !important;");
  });

  it("interactive가 true이면 상호작용 차단을 풀어 준다", () => {
    render(<TemplatePreviewFrame html={'<a href="/landing">이동</a>'} interactive={true} />);

    const host = screen.getByTitle("template-preview-frame");
    expect(host).not.toHaveClass("pointer-events-none");
    expect(host).toHaveAttribute("tabindex", "0");
    expect(getShadowHtml(host)).not.toContain(
      "a, a *, button, button *, input, select, textarea, label, form { pointer-events: none !important; }",
    );
  });

  it("theme이 dark이면 다크 테마 색상을 적용한다", () => {
    render(<TemplatePreviewFrame html="<p>다크 미리보기</p>" theme="dark" />);

    const host = screen.getByTitle("template-preview-frame");
    expect(getShadowHtml(host)).toContain("background: #020617;");
    expect(getShadowHtml(host)).toContain("color: #f8fafc;");
  });

  it("body 태그가 포함된 HTML은 body 내부만 추출해 렌더링한다", () => {
    render(
      <TemplatePreviewFrame
        html="<html><head><style>body{background:red;}</style></head><body><p>본문만 유지</p></body></html>"
      />,
    );

    const host = screen.getByTitle("template-preview-frame");
    expect(getShadowHtml(host)).toContain("<p>본문만 유지</p>");
    expect(getShadowHtml(host)).not.toContain("background:red");
  });

  it("외부 script 태그를 제거한다", () => {
    render(
      <TemplatePreviewFrame
        html={'<div>미리보기</div><script>window.alert("x")</script><p>내용 유지</p>'}
      />,
    );

    const host = screen.getByTitle("template-preview-frame");
    const shadow = getShadowHtml(host);
    expect(shadow).toContain("<div>미리보기</div>");
    expect(shadow).toContain("<p>내용 유지</p>");
    expect(shadow).not.toContain('window.alert("x")');
  });

  it("인라인 이벤트 핸들러를 제거한다", () => {
    render(
      <TemplatePreviewFrame
        html={'<img src="x" onerror="alert(1)"><button onclick="submit()">전송</button>'}
      />,
    );

    const host = screen.getByTitle("template-preview-frame");
    const shadow = getShadowHtml(host);
    expect(shadow).toContain("<button");
    expect(shadow).toContain("전송</button>");
    expect(shadow).not.toContain("onerror");
    expect(shadow).not.toContain("onclick");
  });

  it("iframe 대신 Shadow DOM을 사용해 렌더링한다", () => {
    render(<TemplatePreviewFrame html="<p>Shadow DOM 확인</p>" />);

    const host = screen.getByTitle("template-preview-frame");
    expect(host.tagName).toBe("DIV");
    expect(host.shadowRoot).toBeTruthy();
    expect(getShadowHtml(host)).toContain("<p>Shadow DOM 확인</p>");
  });
});
