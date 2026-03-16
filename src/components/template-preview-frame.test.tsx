import React from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { TemplatePreviewFrame } from "./template-preview-frame";

describe("TemplatePreviewFrame", () => {
  it("기본 미리보기는 링크와 폼 상호작용을 비활성화한다", () => {
    render(
      <TemplatePreviewFrame
        html={'<form action="/submit"><a href="/landing">이동</a><button type="submit">제출</button></form>'}
      />,
    );

    const frame = screen.getByTitle("template-preview-frame");
    expect(frame).toHaveAttribute("srcdoc");
    expect(frame.getAttribute("srcdoc")).toContain("pointer-events: none !important;");
  });

  it("interactive가 true이면 상호작용 차단 CSS를 넣지 않는다", () => {
    render(<TemplatePreviewFrame html={'<a href="/landing">이동</a>'} interactive={true} />);

    const frame = screen.getByTitle("template-preview-frame");
    expect(frame.getAttribute("srcdoc")).not.toContain(
      "a, a *, button, button *, input, select, textarea, label, form { pointer-events: none !important; }",
    );
  });

  it("theme이 dark이면 iframe body 배경과 텍스트 색을 다크 테마로 맞춘다", () => {
    render(<TemplatePreviewFrame html="<p>다크 미리보기</p>" theme="dark" />);

    const frame = screen.getByTitle("template-preview-frame");
    expect(frame.getAttribute("srcdoc")).toContain("background: #020617;");
    expect(frame.getAttribute("srcdoc")).toContain("color: #f8fafc;");
  });

  it("body 태그가 포함된 HTML은 body 내부만 추출해 렌더링한다", () => {
    render(
      <TemplatePreviewFrame
        html="<html><head><style>body{background:red;}</style></head><body><p>본문만 유지</p></body></html>"
      />,
    );

    const frame = screen.getByTitle("template-preview-frame");
    expect(frame.getAttribute("srcdoc")).toContain("<p>본문만 유지</p>");
    expect(frame.getAttribute("srcdoc")).not.toContain("background:red");
  });
});
