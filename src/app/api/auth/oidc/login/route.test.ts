import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  createPkceChallenge: vi.fn(),
  createPkceVerifier: vi.fn(),
  createRandomParam: vi.fn(),
  setTransactionCookie: vi.fn(),
  buildAuthorizationUrl: vi.fn(),
  encodeOidcTransaction: vi.fn(),
  normalizeReturnTo: vi.fn(),
}));

vi.mock("@/server/auth/crypto", () => ({
  createPkceChallenge: mocks.createPkceChallenge,
  createPkceVerifier: mocks.createPkceVerifier,
  createRandomParam: mocks.createRandomParam,
}));

vi.mock("@/server/auth/cookies", () => ({
  setTransactionCookie: mocks.setTransactionCookie,
}));

vi.mock("@/server/auth/oidc", async () => {
  const actual = await vi.importActual<typeof import("@/server/auth/oidc")>(
    "@/server/auth/oidc",
  );
  return {
    ...actual,
    buildAuthorizationUrl: mocks.buildAuthorizationUrl,
  };
});

vi.mock("@/server/auth/transaction", () => ({
  encodeOidcTransaction: mocks.encodeOidcTransaction,
}));

vi.mock("@/server/auth/redirect", () => ({
  normalizeReturnTo: mocks.normalizeReturnTo,
}));

import { GET } from "./route";

describe("GET /api/auth/oidc/login", () => {
  beforeEach(() => {
    mocks.createPkceChallenge.mockReset();
    mocks.createPkceVerifier.mockReset();
    mocks.createRandomParam.mockReset();
    mocks.setTransactionCookie.mockReset();
    mocks.buildAuthorizationUrl.mockReset();
    mocks.encodeOidcTransaction.mockReset();
    mocks.normalizeReturnTo.mockReset();

    mocks.createRandomParam.mockReturnValueOnce("state-1").mockReturnValueOnce("nonce-1");
    mocks.createPkceVerifier.mockReturnValue("verifier-1");
    mocks.createPkceChallenge.mockReturnValue("challenge-1");
    mocks.buildAuthorizationUrl.mockResolvedValue(
      new URL("https://auth.evriz.co.kr/oauth2/authorize?request=1"),
    );
    mocks.encodeOidcTransaction.mockReturnValue("tx-token");
    mocks.normalizeReturnTo.mockImplementation((value: string | null | undefined) =>
      value ? String(value) : "/",
    );
  });

  it("prompt=create 요청이면 authorize URL 생성 시 prompt를 전달한다", async () => {
    const request = new NextRequest(
      "http://localhost/api/auth/oidc/login?returnTo=%2Fprojects&prompt=create",
    );

    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://auth.evriz.co.kr/oauth2/authorize?request=1",
    );
    expect(mocks.buildAuthorizationUrl).toHaveBeenCalledWith({
      state: "state-1",
      nonce: "nonce-1",
      codeChallenge: "challenge-1",
      prompt: "create",
    });
    expect(mocks.encodeOidcTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        state: "state-1",
        nonce: "nonce-1",
        codeVerifier: "verifier-1",
        returnTo: "/projects",
      }),
    );
    expect(mocks.setTransactionCookie).toHaveBeenCalledTimes(1);
  });

  it("prompt=none,prompt=create 같이 전달되면 400을 반환한다", async () => {
    const request = new NextRequest(
      "http://localhost/api/auth/oidc/login?prompt=none&prompt=create",
    );

    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain("충돌");
    expect(mocks.buildAuthorizationUrl).not.toHaveBeenCalled();
  });

  it("지원하지 않는 prompt 값이면 400을 반환한다", async () => {
    const request = new NextRequest("http://localhost/api/auth/oidc/login?prompt=consent");

    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain("허용값");
    expect(mocks.buildAuthorizationUrl).not.toHaveBeenCalled();
  });
});
