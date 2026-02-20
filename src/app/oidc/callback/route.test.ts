import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { encodeOidcTransaction } from "@/server/auth/transaction";

describe("GET /oidc/callback", () => {
  it("state 불일치 시 인증 실패를 반환한다", async () => {
    process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
    process.env.AUTH_SESSION_SECRET = "test-auth-session-secret";
    process.env.AUTH_TOKEN_ENC_KEY = "test-auth-token-key";
    process.env.AUTH_TRANSACTION_COOKIE_NAME = "ps_oidc_txn";

    const { GET } = await import("./route");

    const tx = encodeOidcTransaction({
      state: "state-1",
      nonce: "nonce-1",
      codeVerifier: "verifier-1",
      returnTo: "/",
      createdAt: Date.now(),
    });

    const request = new NextRequest("http://localhost/oidc/callback?code=abc&state=state-2", {
      headers: {
        cookie: `ps_oidc_txn=${tx}`,
      },
    });

    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain("state");
  });
});
