import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "./middleware";

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.restoreAllMocks();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  process.env.AUTH_SESSION_COOKIE_NAME = "ps_session";
  delete process.env.AUTH_DEV_BYPASS;
  delete process.env.AUTH_DEV_USER_SUB;
  delete process.env.AUTH_DEV_USER_EMAIL;
  delete process.env.AUTH_DEV_USER_NAME;
});

describe("middleware 인증 게이트", () => {
  it("AUTH_DEV_BYPASS가 undefined이면 보호 페이지 무세션 요청을 OIDC 로그인 시작점으로 리다이렉트한다", async () => {
    const request = new NextRequest("http://localhost/projects?tab=list");
    const response = await middleware(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost/api/auth/oidc/login?returnTo=%2Fprojects%3Ftab%3Dlist",
    );
  });

  it("AUTH_DEV_BYPASS가 undefined이면 보호 API 무세션 요청에 401을 반환한다", async () => {
    const request = new NextRequest("http://localhost/api/projects");
    const response = await middleware(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ error: "Unauthorized" });
  });

  it("AUTH_DEV_BYPASS=true이면 보호 페이지 무세션 요청을 통과시킨다", async () => {
    process.env.AUTH_DEV_BYPASS = "true";

    const request = new NextRequest("http://localhost/projects?tab=list");
    const response = await middleware(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("AUTH_DEV_BYPASS=true이면 보호 API 무세션 요청을 통과시킨다", async () => {
    process.env.AUTH_DEV_BYPASS = "true";

    const request = new NextRequest("http://localhost/api/projects");
    const response = await middleware(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("AUTH_DEV_BYPASS=false이면 보호 페이지 무세션 요청을 OIDC 로그인 시작점으로 리다이렉트한다", async () => {
    process.env.AUTH_DEV_BYPASS = "false";

    const request = new NextRequest("http://localhost/projects?tab=list");
    const response = await middleware(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost/api/auth/oidc/login?returnTo=%2Fprojects%3Ftab%3Dlist",
    );
  });

  it("AUTH_DEV_BYPASS=false이면 보호 API 무세션 요청에 401을 반환한다", async () => {
    process.env.AUTH_DEV_BYPASS = "false";

    const request = new NextRequest("http://localhost/api/projects");
    const response = await middleware(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ error: "Unauthorized" });
  });

  it("세션 검증이 성공하면 보호 페이지 요청을 통과시킨다", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          authenticated: true,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    const request = new NextRequest("http://localhost/projects", {
      headers: {
        cookie: "ps_session=session-1",
      },
    });

    const response = await middleware(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("세션 쿠키가 있어도 검증 실패면 보호 API에서 401을 반환한다", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          authenticated: false,
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    const request = new NextRequest("http://localhost/api/projects", {
      headers: {
        cookie: "ps_session=session-1",
      },
    });

    const response = await middleware(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ error: "Unauthorized" });
  });
});
