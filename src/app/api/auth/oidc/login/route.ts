import { NextRequest, NextResponse } from "next/server";
import {
  createPkceChallenge,
  createPkceVerifier,
  createRandomParam,
} from "@/server/auth/crypto";
import { setTransactionCookie } from "@/server/auth/cookies";
import { buildAuthorizationUrl } from "@/server/auth/oidc";
import { encodeOidcTransaction } from "@/server/auth/transaction";
import { normalizeReturnTo } from "@/server/auth/redirect";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const returnTo = normalizeReturnTo(request.nextUrl.searchParams.get("returnTo"));
    const state = createRandomParam();
    const nonce = createRandomParam();
    const codeVerifier = createPkceVerifier();
    const codeChallenge = createPkceChallenge(codeVerifier);

    const authorizeUrl = await buildAuthorizationUrl({
      state,
      nonce,
      codeChallenge,
    });

    const transactionToken = encodeOidcTransaction({
      state,
      nonce,
      codeVerifier,
      returnTo,
      createdAt: Date.now(),
    });

    const response = NextResponse.redirect(authorizeUrl);
    setTransactionCookie(response, transactionToken);
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "OIDC 로그인 준비 중 오류가 발생했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
