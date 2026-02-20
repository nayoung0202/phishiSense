import { NextRequest, NextResponse } from "next/server";
import { getAuthSessionConfig } from "@/server/auth/config";
import { createOpaqueSessionId, encryptAuthToken } from "@/server/auth/crypto";
import {
  clearSessionCookie,
  clearTransactionCookie,
  getTransactionFromRequest,
  setSessionCookie,
} from "@/server/auth/cookies";
import {
  exchangeAuthorizationCode,
  fetchUserInfo,
  verifyIdToken,
} from "@/server/auth/oidc";
import { createAuthSession } from "@/server/auth/sessionStore";
import { decodeOidcTransaction, normalizeReturnTo } from "@/server/auth/transaction";
import type { AuthUserPrincipal } from "@/server/auth/types";

export const runtime = "nodejs";

const toOptionalString = (value: unknown) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const buildUserPrincipal = (options: {
  claims: Record<string, unknown>;
  userInfo: Record<string, unknown>;
}): AuthUserPrincipal => {
  const sub =
    toOptionalString(options.userInfo.sub) ?? toOptionalString(options.claims.sub) ?? "";

  if (!sub) {
    throw new Error("userinfo/ID Token에 sub가 없습니다.");
  }

  return {
    sub,
    email: toOptionalString(options.userInfo.email) ?? toOptionalString(options.claims.email),
    name: toOptionalString(options.userInfo.name) ?? toOptionalString(options.claims.name),
  };
};

const buildFailureResponse = (message: string, status: number) => {
  const response = NextResponse.json({ error: message }, { status });
  clearTransactionCookie(response);
  clearSessionCookie(response);
  return response;
};

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const error = request.nextUrl.searchParams.get("error");

  if (error) {
    return buildFailureResponse(`OIDC 인증 실패: ${error}`, 401);
  }

  if (!code || !state) {
    return buildFailureResponse("OIDC callback 파라미터(code/state)가 누락되었습니다.", 400);
  }

  const transactionCookie = getTransactionFromRequest(request);
  const transaction = decodeOidcTransaction(transactionCookie);

  if (!transaction) {
    return buildFailureResponse("OIDC 트랜잭션 쿠키가 없거나 만료되었습니다.", 400);
  }

  if (transaction.state !== state) {
    return buildFailureResponse("OIDC state 검증에 실패했습니다.", 400);
  }

  try {
    const token = await exchangeAuthorizationCode(code, transaction.codeVerifier);

    if (!token.id_token) {
      return buildFailureResponse("OIDC 응답에 id_token이 없습니다.", 400);
    }

    const claims = await verifyIdToken({
      idToken: token.id_token,
      expectedNonce: transaction.nonce,
    });

    let userInfo: Record<string, unknown> = {};
    try {
      userInfo = await fetchUserInfo(token.access_token);
    } catch {
      userInfo = {};
    }

    const user = buildUserPrincipal({
      claims,
      userInfo,
    });

    const sessionId = createOpaqueSessionId();
    const now = new Date();
    const config = getAuthSessionConfig();
    const accessTokenExp = token.expires_in
      ? new Date(now.getTime() + token.expires_in * 1000)
      : null;

    await createAuthSession({
      sessionId,
      user,
      accessTokenExp,
      refreshTokenEnc: token.refresh_token ? encryptAuthToken(token.refresh_token) : null,
      idleExpiresAt: new Date(now.getTime() + config.idleTtlSec * 1000),
      absoluteExpiresAt: new Date(now.getTime() + config.absoluteTtlSec * 1000),
    });

    const returnTo = normalizeReturnTo(transaction.returnTo);
    const response = NextResponse.redirect(new URL(returnTo, request.url));
    clearTransactionCookie(response);
    setSessionCookie(response, sessionId);
    return response;
  } catch (authError) {
    const message =
      authError instanceof Error ? authError.message : "OIDC 콜백 처리 중 오류가 발생했습니다.";
    return buildFailureResponse(message, 401);
  }
}
