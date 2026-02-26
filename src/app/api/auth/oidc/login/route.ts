import { NextRequest, NextResponse } from "next/server";
import {
  createPkceChallenge,
  createPkceVerifier,
  createRandomParam,
} from "@/server/auth/crypto";
import { setTransactionCookie } from "@/server/auth/cookies";
import {
  buildAuthorizationUrl,
  SUPPORTED_OIDC_PROMPTS,
  type OidcPrompt,
} from "@/server/auth/oidc";
import { encodeOidcTransaction } from "@/server/auth/transaction";
import { normalizeReturnTo } from "@/server/auth/redirect";

export const runtime = "nodejs";

const supportedPromptSet = new Set<string>(SUPPORTED_OIDC_PROMPTS);

class InvalidPromptError extends Error {}

const parsePrompt = (searchParams: URLSearchParams): OidcPrompt | undefined => {
  const rawTokens = searchParams
    .getAll("prompt")
    .flatMap((value) => value.trim().split(/\s+/))
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  if (rawTokens.length === 0) {
    return undefined;
  }

  const uniqueTokens = Array.from(new Set(rawTokens));
  if (uniqueTokens.length > 1) {
    throw new InvalidPromptError(
      "OIDC prompt 값이 충돌합니다. `none` 또는 `create` 중 하나만 지정하세요.",
    );
  }

  const [prompt] = uniqueTokens;
  if (!prompt || !supportedPromptSet.has(prompt)) {
    throw new InvalidPromptError(
      `지원하지 않는 OIDC prompt 값입니다. 허용값: ${SUPPORTED_OIDC_PROMPTS.join(", ")}`,
    );
  }

  return prompt as OidcPrompt;
};

export async function GET(request: NextRequest) {
  try {
    const returnTo = normalizeReturnTo(
      request.nextUrl.searchParams.get("returnTo"),
    );
    const prompt = parsePrompt(request.nextUrl.searchParams);
    const state = createRandomParam();
    const nonce = createRandomParam();
    const codeVerifier = createPkceVerifier();
    const codeChallenge = createPkceChallenge(codeVerifier);

    const authorizeUrl = await buildAuthorizationUrl({
      state,
      nonce,
      codeChallenge,
      prompt,
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
    if (error instanceof InvalidPromptError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const message =
      error instanceof Error
        ? error.message
        : "OIDC 로그인 준비 중 오류가 발생했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
