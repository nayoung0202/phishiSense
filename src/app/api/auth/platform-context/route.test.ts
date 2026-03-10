import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const authMock = vi.hoisted(() => ({
  requireAuth: vi.fn(),
}));

const contextMock = vi.hoisted(() => ({
  resolvePlatformContext: vi.fn(),
}));

vi.mock("@/server/auth/requireAuth", () => ({
  requireAuth: authMock.requireAuth,
}));

vi.mock("@/server/platform/context", () => ({
  resolvePlatformContext: contextMock.resolvePlatformContext,
}));

import { GET } from "./route";

describe("GET /api/auth/platform-context", () => {
  beforeEach(() => {
    authMock.requireAuth.mockReset();
    contextMock.resolvePlatformContext.mockReset();
  });

  it("인증이 없으면 401을 반환한다", async () => {
    authMock.requireAuth.mockResolvedValue(null);

    const response = await GET(
      new NextRequest("http://localhost/api/auth/platform-context"),
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.authenticated).toBe(false);
  });

  it("플랫폼 컨텍스트를 반환한다", async () => {
    authMock.requireAuth.mockResolvedValue({
      sessionId: "session-1",
      user: { sub: "user-1", email: "u@example.com", name: "사용자" },
      tenantId: "tenant-1",
      accessToken: "access-token",
      idleExpiresAt: new Date().toISOString(),
      absoluteExpiresAt: new Date().toISOString(),
    });
    contextMock.resolvePlatformContext.mockResolvedValue({
      status: "ready",
      hasAccess: true,
      onboardingRequired: false,
      tenantId: "tenant-1",
      currentTenantId: "tenant-1",
      tenants: [],
      products: [],
      platformProduct: null,
      localEntitlement: null,
    });

    const response = await GET(
      new NextRequest("http://localhost/api/auth/platform-context"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("ready");
    expect(body.hasAccess).toBe(true);
  });
});
