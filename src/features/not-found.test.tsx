import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import NotFound from "./not-found";

describe("NotFound", () => {
  it("간단한 404 안내 문구를 렌더링한다", () => {
    render(<NotFound />);

    expect(screen.getByText("요청한 페이지를 찾을 수 없습니다.")).toBeInTheDocument();
  });
});
