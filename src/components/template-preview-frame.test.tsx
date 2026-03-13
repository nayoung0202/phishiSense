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
    expect(frame.getAttribute("srcdoc")).not.toContain("pointer-events: none !important;");
  });
});
