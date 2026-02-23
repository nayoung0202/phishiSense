import { beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

beforeEach(() => {
  process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
  delete process.env.AUTH_DEV_BYPASS;
  delete process.env.AUTH_DEV_USER_SUB;
  delete process.env.AUTH_DEV_USER_EMAIL;
  delete process.env.AUTH_DEV_USER_NAME;
});

const loadGet = async () => {
  const module = await import("./route");
  return module.GET;
};

describe("GET /api/auth/session", () => {
  it("AUTH_DEV_BYPASS=true이면 무세션 요청도 인증 성공을 반환한다", async () => {
    process.env.AUTH_DEV_BYPASS = "true";
    process.env.AUTH_DEV_USER_SUB = "local-dev-user";
    process.env.AUTH_DEV_USER_EMAIL = "local-dev@example.com";
    process.env.AUTH_DEV_USER_NAME = "로컬 개발자";

    const GET = await loadGet();
    const request = new NextRequest("http://localhost/api/auth/session");
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.authenticated).toBe(true);
    expect(body.user).toEqual({
      sub: "local-dev-user",
      email: "local-dev@example.com",
      name: "로컬 개발자",
    });
    expect(typeof body.idleExpiresAt).toBe("string");
    expect(typeof body.absoluteExpiresAt).toBe("string");
  });

  it("AUTH_DEV_BYPASS가 undefined이면 무세션 요청에 401을 반환한다", async () => {
    const GET = await loadGet();
    const request = new NextRequest("http://localhost/api/auth/session");
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({
      authenticated: false,
    });
  });

  it("AUTH_DEV_BYPASS=false이면 무세션 요청에 401을 반환한다", async () => {
    process.env.AUTH_DEV_BYPASS = "false";

    const GET = await loadGet();
    const request = new NextRequest("http://localhost/api/auth/session");
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({
      authenticated: false,
    });
  });
});
