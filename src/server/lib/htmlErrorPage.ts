import { NextResponse } from "next/server";

type HtmlErrorPageOptions = {
  status: number;
  title: string;
  message: string;
  label?: string;
};

export const HTML_RESPONSE_SECURITY_HEADERS = {
  "Content-Security-Policy":
    "default-src 'none'; script-src 'none'; style-src 'unsafe-inline'; img-src data: http: https:; font-src data: http: https:; base-uri 'none'; form-action 'self'; frame-ancestors 'none';",
};

export const buildHtmlErrorPage = (_options: Omit<HtmlErrorPageOptions, "status">) =>
  [
    "<!doctype html>",
    '<html lang="ko">',
    "<head>",
    '<meta charset="utf-8" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1" />',
    "<title>404</title>",
    "<style>",
    "html, body { margin: 0; min-height: 100%; }",
    "body { display: flex; align-items: center; justify-content: center; padding: 24px; background: #ffffff; color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif; }",
    ".message { font-size: 16px; font-weight: 500; text-align: center; }",
    "</style>",
    "</head>",
    "<body>",
    '<p class="message">요청한 페이지를 찾을 수 없습니다.</p>',
    "</body>",
    "</html>",
  ].join("");

export const buildHtmlErrorResponse = ({ status, title, message, label }: HtmlErrorPageOptions) =>
  new NextResponse(buildHtmlErrorPage({ title, message, label }), {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      ...HTML_RESPONSE_SECURITY_HEADERS,
    },
  });
