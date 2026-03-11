import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { PlatformApiError } from "@/server/platform/client";

const authMock = vi.hoisted(() => ({
  requireAuth: vi.fn(),
}));

const sessionStoreMock = vi.hoisted(() => ({
  setAuthSessionTenant: vi.fn(),
}));

const clientMock = vi.hoisted(() => ({
  createPlatformTenant: vi.fn(),
}));

const contextMock = vi.hoisted(() => ({
  resolvePlatformContext: vi.fn(),
}));

vi.mock("@/server/auth/requireAuth", () => ({
  requireAuth: authMock.requireAuth,
}));

vi.mock("@/server/auth/sessionStore", () => ({
  setAuthSessionTenant: sessionStoreMock.setAuthSessionTenant,
}));

vi.mock("@/server/platform/client", async () => {
  const actual = await vi.importActual<typeof import("@/server/platform/client")>(
    "@/server/platform/client",
  );

  return {
    ...actual,
    createPlatformTenant: clientMock.createPlatformTenant,
  };
});

vi.mock("@/server/platform/context", () => ({
  resolvePlatformContext: contextMock.resolvePlatformContext,
}));

import { POST } from "./route";

describe("POST /api/platform/tenants", () => {
  beforeEach(() => {
    authMock.requireAuth.mockReset();
    sessionStoreMock.setAuthSessionTenant.mockReset();
    clientMock.createPlatformTenant.mockReset();
    contextMock.resolvePlatformContext.mockReset();
  });

  it("인증이 없으면 401을 반환한다", async () => {
    authMock.requireAuth.mockResolvedValue(null);

    const response = await POST(
      new NextRequest("http://localhost/api/platform/tenants", {
        method: "POST",
        body: JSON.stringify({ name: "Acme" }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.authenticated).toBe(false);
  });

  it("tenant 생성 후 최신 platform context를 반환한다", async () => {
    authMock.requireAuth.mockResolvedValue({
      sessionId: "session-1",
      user: { sub: "user-1", email: "u@example.com", name: "사용자" },
      tenantId: null,
      accessToken: "access-token",
      idleExpiresAt: new Date().toISOString(),
      absoluteExpiresAt: new Date().toISOString(),
    });
    clientMock.createPlatformTenant.mockResolvedValue({
      tenantId: "tenant-1",
      name: "Acme",
      role: "OWNER",
    });
    contextMock.resolvePlatformContext.mockResolvedValue({
      status: "entitlement_pending",
      hasAccess: false,
      onboardingRequired: true,
      tenantId: "tenant-1",
      currentTenantId: "tenant-1",
      tenants: [{ tenantId: "tenant-1", name: "Acme", role: "OWNER" }],
      products: [],
      platformProduct: null,
      localEntitlement: null,
    });

    const response = await POST(
      new NextRequest("http://localhost/api/platform/tenants", {
        method: "POST",
        body: JSON.stringify({ name: "Acme" }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(clientMock.createPlatformTenant).toHaveBeenCalledWith({
      accessToken: "access-token",
      name: "Acme",
    });
    expect(sessionStoreMock.setAuthSessionTenant).toHaveBeenCalledWith(
      "session-1",
      "tenant-1",
    );
    expect(contextMock.resolvePlatformContext).toHaveBeenCalledWith({
      auth: expect.objectContaining({
        sessionId: "session-1",
        tenantId: "tenant-1",
      }),
      preferredTenantId: "tenant-1",
      forceRefresh: true,
    });
    expect(body.createdTenant).toEqual({
      tenantId: "tenant-1",
      name: "Acme",
      role: "OWNER",
    });
    expect(body.status).toBe("entitlement_pending");
  });

  it("입력이 비어 있으면 422를 반환한다", async () => {
    authMock.requireAuth.mockResolvedValue({
      sessionId: "session-1",
      user: { sub: "user-1", email: "u@example.com", name: "사용자" },
      tenantId: null,
      accessToken: "access-token",
      idleExpiresAt: new Date().toISOString(),
      absoluteExpiresAt: new Date().toISOString(),
    });

    const response = await POST(
      new NextRequest("http://localhost/api/platform/tenants", {
        method: "POST",
        body: JSON.stringify({ name: "   " }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.error).toBe("회사 또는 조직 이름을 확인해 주세요.");
  });

  it("platform 409 오류를 사용자 메시지로 매핑한다", async () => {
    authMock.requireAuth.mockResolvedValue({
      sessionId: "session-1",
      user: { sub: "user-1", email: "u@example.com", name: "사용자" },
      tenantId: null,
      accessToken: "access-token",
      idleExpiresAt: new Date().toISOString(),
      absoluteExpiresAt: new Date().toISOString(),
    });
    clientMock.createPlatformTenant.mockRejectedValue(
      new PlatformApiError(409, "conflict"),
    );

    const response = await POST(
      new NextRequest("http://localhost/api/platform/tenants", {
        method: "POST",
        body: JSON.stringify({ name: "Acme" }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error).toContain("다른 이름으로 다시 시도");
  });
});
