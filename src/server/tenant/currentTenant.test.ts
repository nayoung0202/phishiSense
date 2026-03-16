import { describe, expect, it, vi, beforeEach } from "vitest";
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

import {
  ReadyTenantContextError,
  isReadyTenantContextError,
  requireReadyTenant,
} from "./currentTenant";

const baseAuth = {
  sessionId: "session-1",
  user: { sub: "user-1", email: "user@example.com", name: "사용자" },
  tenantId: "tenant-a",
  accessToken: "access-token",
  idleExpiresAt: new Date("2026-03-16T00:00:00Z").toISOString(),
  absoluteExpiresAt: new Date("2026-03-17T00:00:00Z").toISOString(),
};

describe("requireReadyTenant", () => {
  beforeEach(() => {
    authMock.requireAuth.mockReset();
    contextMock.resolvePlatformContext.mockReset();
  });

  it("인증이 없으면 401 에러를 던진다", async () => {
    authMock.requireAuth.mockResolvedValue(null);

    await expect(
      requireReadyTenant(new NextRequest("http://localhost/api/projects")),
    ).rejects.toMatchObject({
      status: 401,
      code: "unauthenticated",
    });
  });

  it("ready 상태면 tenant context를 반환한다", async () => {
    authMock.requireAuth.mockResolvedValue(baseAuth);
    contextMock.resolvePlatformContext.mockResolvedValue({
      status: "ready",
      hasAccess: true,
      onboardingRequired: false,
      tenantId: "tenant-a",
      currentTenantId: "tenant-a",
      tenants: [],
      products: [],
      platformProduct: null,
      localEntitlement: null,
    });

    const result = await requireReadyTenant(
      new NextRequest("http://localhost/api/projects"),
    );

    expect(result.tenantId).toBe("tenant-a");
    expect(result.auth.sessionId).toBe("session-1");
  });

  it("dev_bypass 상태도 허용한다", async () => {
    authMock.requireAuth.mockResolvedValue({
      ...baseAuth,
      accessToken: null,
      tenantId: "tenant-local-001",
    });
    contextMock.resolvePlatformContext.mockResolvedValue({
      status: "dev_bypass",
      hasAccess: true,
      onboardingRequired: false,
      tenantId: "tenant-local-001",
      currentTenantId: "tenant-local-001",
      tenants: [],
      products: [],
      platformProduct: null,
      localEntitlement: null,
    });

    const result = await requireReadyTenant(
      new NextRequest("http://localhost/api/projects"),
    );

    expect(result.tenantId).toBe("tenant-local-001");
  });

  it("tenant 준비가 안 됐으면 403 에러를 던진다", async () => {
    authMock.requireAuth.mockResolvedValue(baseAuth);
    contextMock.resolvePlatformContext.mockResolvedValue({
      status: "entitlement_pending",
      hasAccess: false,
      onboardingRequired: true,
      tenantId: "tenant-a",
      currentTenantId: "tenant-a",
      tenants: [],
      products: [],
      platformProduct: null,
      localEntitlement: null,
    });

    await expect(
      requireReadyTenant(new NextRequest("http://localhost/api/projects")),
    ).rejects.toMatchObject({
      status: 403,
      code: "tenant_not_ready",
      platformStatus: "entitlement_pending",
    });
  });

  it("ready인데 tenantId가 없으면 500 에러를 던진다", async () => {
    authMock.requireAuth.mockResolvedValue({
      ...baseAuth,
      tenantId: null,
    });
    contextMock.resolvePlatformContext.mockResolvedValue({
      status: "ready",
      hasAccess: true,
      onboardingRequired: false,
      tenantId: null,
      currentTenantId: null,
      tenants: [],
      products: [],
      platformProduct: null,
      localEntitlement: null,
    });

    await expect(
      requireReadyTenant(new NextRequest("http://localhost/api/projects")),
    ).rejects.toMatchObject({
      status: 500,
      code: "tenant_context_missing",
      platformStatus: "ready",
    });
  });
});

describe("isReadyTenantContextError", () => {
  it("tenant context 에러를 식별한다", () => {
    const error = new ReadyTenantContextError(
      403,
      "tenant_not_ready",
      "사용 가능한 tenant 컨텍스트가 필요합니다.",
      { platformStatus: "tenant_missing" },
    );

    expect(isReadyTenantContextError(error)).toBe(true);
    expect(isReadyTenantContextError(new Error("other"))).toBe(false);
  });
});
