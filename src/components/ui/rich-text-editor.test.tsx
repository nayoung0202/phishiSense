import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RichTextEditor } from "./rich-text-editor";

describe("RichTextEditor", () => {
  it("편집 모드에 다크 배경 가독성 보정 클래스를 적용한다", () => {
    const handleChange = vi.fn();
    const { container } = render(<RichTextEditor value="<p>본문</p>" onChange={handleChange} />);

    expect(container.querySelector(".template-editor-dark-readable")).not.toBeNull();
  });

  it("미리보기 전환 시 편집 DOM을 교체 렌더링한다", () => {
    const handleChange = vi.fn();
    const { container } = render(
      <RichTextEditor
        value="<p>편집 본문</p>"
        previewHtml="<p>미리보기 본문</p>"
        onChange={handleChange}
      />,
    );

    expect(container.textContent).toContain("편집 본문");

    fireEvent.mouseDown(screen.getByRole("button", { name: "미리보기" }));

    expect(container.querySelector("[contenteditable='true']")).toBeNull();
    expect(container.textContent).not.toContain("편집 본문");
    expect(screen.getByTitle("template-preview-frame")).toBeInTheDocument();
  });
});
