import type { NextRequest } from "next/server";
import { getAuthDevBypassConfig, getAuthSessionConfig } from "./config";
import { decryptAuthToken, encryptAuthToken } from "./crypto";
import { getSessionIdFromRequest } from "./cookies";
import { refreshAccessToken } from "./oidc";
import {
  getAuthSessionById,
  revokeAuthSession,
  touchAuthSession,
} from "./sessionStore";
import type { AuthUserPrincipal } from "./types";

const REFRESH_SKEW_MS = 1000 * 30;

export type AuthenticatedContext = {
  sessionId: string;
  user: AuthUserPrincipal;
  tenantId: string | null;
  idleExpiresAt: string;
  absoluteExpiresAt: string;
};

const toPrincipal = (input: {
  sub: string;
  email: string | null;
  name: string | null;
}): AuthUserPrincipal => ({
  sub: input.sub,
  email: input.email,
  name: input.name,
});

export async function requireAuth(
  request: NextRequest,
): Promise<AuthenticatedContext | null> {
  const devBypass = getAuthDevBypassConfig();
  if (devBypass.enabled) {
    const now = new Date();
    const config = getAuthSessionConfig();
    return {
      sessionId: "dev-bypass-session",
      user: devBypass.user,
      tenantId: process.env.DEV_TENANT_ID ?? "tenant-local-001",
      idleExpiresAt: new Date(
        now.getTime() + config.idleTtlSec * 1000,
      ).toISOString(),
      absoluteExpiresAt: new Date(
        now.getTime() + config.absoluteTtlSec * 1000,
      ).toISOString(),
    };
  }

  const sessionId = getSessionIdFromRequest(request);
  if (!sessionId) {
    return null;
  }

  const session = await getAuthSessionById(sessionId);
  if (!session) {
    return null;
  }

  if (session.revokedAt) {
    return null;
  }

  const now = new Date();
  if (now >= session.absoluteExpiresAt || now >= session.idleExpiresAt) {
    await revokeAuthSession(sessionId);
    return null;
  }

  const config = getAuthSessionConfig();

  let nextAccessTokenExp = session.accessTokenExp;
  let nextRefreshTokenEnc = session.refreshTokenEnc;
  let didRefresh = false;

  if (
    session.accessTokenExp &&
    session.accessTokenExp.getTime() <= now.getTime() + REFRESH_SKEW_MS &&
    session.refreshTokenEnc
  ) {
    try {
      const refreshToken = decryptAuthToken(session.refreshTokenEnc);
      if (!refreshToken) {
        await revokeAuthSession(sessionId);
        return null;
      }

      const refreshed = await refreshAccessToken(refreshToken);
      if (refreshed.expires_in) {
        nextAccessTokenExp = new Date(
          now.getTime() + refreshed.expires_in * 1000,
        );
      }

      if (refreshed.refresh_token) {
        nextRefreshTokenEnc = encryptAuthToken(refreshed.refresh_token);
      }

      didRefresh = true;
    } catch {
      await revokeAuthSession(sessionId);
      return null;
    }
  }

  const nextIdleExpiresAt = new Date(
    Math.min(
      session.absoluteExpiresAt.getTime(),
      now.getTime() + config.idleTtlSec * 1000,
    ),
  );

  const shouldTouch =
    didRefresh ||
    session.idleExpiresAt.getTime() - now.getTime() <=
      Math.floor((config.idleTtlSec * 1000) / 2);

  if (shouldTouch) {
    await touchAuthSession({
      sessionId,
      idleExpiresAt: nextIdleExpiresAt,
      accessTokenExp: nextAccessTokenExp,
      refreshTokenEnc: nextRefreshTokenEnc,
    });
  }

  const idleExpiresAt = shouldTouch ? nextIdleExpiresAt : session.idleExpiresAt;

  return {
    sessionId,
    user: toPrincipal(session),
    tenantId: session.tenantId,
    idleExpiresAt: idleExpiresAt.toISOString(),
    absoluteExpiresAt: session.absoluteExpiresAt.toISOString(),
  };
}
