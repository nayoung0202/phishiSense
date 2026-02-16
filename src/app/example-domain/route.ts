import { NextResponse } from "next/server";

const securityHeaders = {
  "Content-Security-Policy":
    "default-src 'none'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none';",
};

const resolveTypeCopy = (value: string | null) => {
  const normalized = (value ?? "").toLowerCase();
  const description =
    "예시 페이지는 링크 미리보기 화면으로, 메일에서 클릭하는 링크가 연결되는지 미리 확인하기 위한 예시 페이지입니다.";
  switch (normalized) {
    case "landing":
      return {
        badge: "랜딩 링크 예시",
        headline: "링크 미리보기 화면",
        description,
      };
    case "training":
      return {
        badge: "훈련 안내 예시",
        headline: "링크 미리보기 화면",
        description,
      };
    case "submit":
      return {
        badge: "제출 링크 예시",
        headline: "링크 미리보기 화면",
        description,
      };
    default:
      return {
        badge: "예시 페이지",
        headline: "링크 미리보기 화면",
        description,
      };
  }
};

const buildHtml = (type: { badge: string; headline: string; description: string }) => `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>PhishSense 예시 도메인</title>
    <style>
      :root {
        color-scheme: dark;
        --bg: hsl(220 25% 12%);
        --bg-elevated: hsl(220 20% 16%);
        --border: hsl(220 20% 25%);
        --text: hsl(0 0% 98%);
        --muted: hsl(220 15% 70%);
        --accent: hsl(185 80% 55%);
        --accent-weak: hsl(185 80% 55% / 0.2);
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: "Inter", "Pretendard", system-ui, -apple-system, sans-serif;
        background: var(--bg);
        color: var(--text);
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 48px 16px;
        background-image:
          radial-gradient(circle at 20% 10%, rgba(56, 189, 248, 0.16), transparent 45%),
          radial-gradient(circle at 80% 0%, rgba(94, 234, 212, 0.12), transparent 50%);
      }
      a { color: var(--accent); text-decoration: none; }
      a:hover { text-decoration: underline; }
      .card {
        width: min(860px, 100%);
        background: rgba(15, 23, 42, 0.88);
        border: 1px solid var(--border);
        border-radius: 24px;
        padding: 32px;
        box-shadow: 0 24px 60px rgba(15, 23, 42, 0.45);
        position: relative;
        overflow: hidden;
      }
      .card::before {
        content: "";
        position: absolute;
        inset: -40% 40% auto -10%;
        height: 220px;
        background: radial-gradient(circle, rgba(56, 189, 248, 0.25), transparent 70%);
        pointer-events: none;
      }
      .badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 12px;
        border-radius: 999px;
        background: var(--accent-weak);
        color: var(--accent);
        font-size: 12px;
        font-weight: 600;
        letter-spacing: 0.02em;
      }
      h1 {
        margin: 16px 0 8px;
        font-size: 32px;
        line-height: 1.2;
      }
      p { margin: 0; color: var(--muted); line-height: 1.6; }
      .actions {
        margin-top: 28px;
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
      }
      .btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 10px 18px;
        border-radius: 999px;
        border: 1px solid transparent;
        font-weight: 600;
      }
      .btn-primary {
        background: var(--accent);
        color: hsl(220 26% 12%);
      }
      .btn-ghost {
        border-color: var(--border);
        color: var(--text);
        background: transparent;
      }
      .footer {
        margin-top: 20px;
        font-size: 12px;
        color: hsl(220 10% 50%);
      }
      code {
        background: rgba(15, 23, 42, 0.6);
        padding: 2px 6px;
        border-radius: 6px;
        color: var(--text);
      }
    </style>
  </head>
  <body>
    <main class="card">
      <span class="badge">PhishSense · ${type.badge}</span>
      <h1>${type.headline}</h1>
      <p>${type.description}</p>

      <div class="actions">
        <a class="btn btn-primary" href="/">대시보드로 돌아가기</a>
        <a class="btn btn-ghost" href="/training-pages">훈련 안내 페이지 보기</a>
      </div>

      <div class="footer">
        이 페이지는 미리보기용 예시 화면이며 실제 훈련 데이터와 연결되지 않습니다.
      </div>
    </main>
  </body>
</html>`;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const copy = resolveTypeCopy(searchParams.get("type"));
  return new NextResponse(buildHtml(copy), {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      ...securityHeaders,
    },
  });
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const copy = resolveTypeCopy(searchParams.get("type"));
  return new NextResponse(buildHtml(copy), {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      ...securityHeaders,
    },
  });
}
