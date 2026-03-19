import { describe, expect, it } from "vitest";
import {
  buildHtmlErrorPage,
  buildHtmlErrorResponse,
  HTML_RESPONSE_SECURITY_HEADERS,
} from "./htmlErrorPage";

describe("htmlErrorPage", () => {
  it("간단한 HTML 404 페이지를 생성한다", () => {
    const html = buildHtmlErrorPage({
      title: "페이지를 찾을 수 없습니다.",
      message: "유효하지 않은 링크입니다.",
      label: "Training Page",
    });

    expect(html).toContain("404");
    expect(html).toContain("요청한 페이지를 찾을 수 없습니다.");
    expect(html).toContain("background: #ffffff");
  });

  it("HTML 응답에 상태 코드와 보안 헤더를 포함한다", async () => {
    const response = buildHtmlErrorResponse({
      status: 404,
      title: "제출 경로를 찾을 수 없습니다.",
      message: "잘못된 제출 주소입니다.",
      label: "Submit Route",
    });

    expect(response.status).toBe(404);
    expect(response.headers.get("Content-Type")).toBe("text/html; charset=utf-8");
    expect(response.headers.get("Content-Security-Policy")).toBe(
      HTML_RESPONSE_SECURITY_HEADERS["Content-Security-Policy"],
    );
    await expect(response.text()).resolves.toContain("요청한 페이지를 찾을 수 없습니다.");
  });
});
