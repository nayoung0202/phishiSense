import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import type { AuthenticatedContext } from "@/server/auth/requireAuth";
import { requireAuth } from "@/server/auth/requireAuth";
import {
  type PlatformContextResult,
  resolvePlatformContext,
} from "@/server/platform/context";

export type ReadyTenantContext = {
  auth: AuthenticatedContext;
  platform: PlatformContextResult;
  tenantId: string;
};

export type ReadyTenantErrorCode =
  | "unauthenticated"
  | "tenant_not_ready"
  | "tenant_context_missing";

export class ReadyTenantContextError extends Error {
  status: number;
  code: ReadyTenantErrorCode;
  platformStatus: PlatformContextResult["status"] | null;

  constructor(
    status: number,
    code: ReadyTenantErrorCode,
    message: string,
    options?: {
      platformStatus?: PlatformContextResult["status"] | null;
    },
  ) {
    super(message);
    this.status = status;
    this.code = code;
    this.platformStatus = options?.platformStatus ?? null;
  }
}

const resolveTenantId = (
  auth: AuthenticatedContext,
  platform: PlatformContextResult,
) => platform.currentTenantId ?? platform.tenantId ?? auth.tenantId ?? null;

export async function requireReadyTenant(
  request: NextRequest,
): Promise<ReadyTenantContext> {
  const auth = await requireAuth(request);
  if (!auth) {
    throw new ReadyTenantContextError(
      401,
      "unauthenticated",
      "로그인이 필요합니다.",
    );
  }

  const platform = await resolvePlatformContext({ auth });
  if (!platform.hasAccess || platform.onboardingRequired) {
    throw new ReadyTenantContextError(
      403,
      "tenant_not_ready",
      "사용 가능한 tenant 컨텍스트가 필요합니다.",
      {
        platformStatus: platform.status,
      },
    );
  }

  const tenantId = resolveTenantId(auth, platform);
  if (!tenantId) {
    throw new ReadyTenantContextError(
      500,
      "tenant_context_missing",
      "현재 tenant 컨텍스트를 확인하지 못했습니다.",
      {
        platformStatus: platform.status,
      },
    );
  }

  return {
    auth,
    platform,
    tenantId,
  };
}

export function isReadyTenantContextError(
  error: unknown,
): error is ReadyTenantContextError {
  return error instanceof ReadyTenantContextError;
}

export function buildReadyTenantErrorResponse(
  error: unknown,
  fallbackMessage: string,
  fallbackStatus = 500,
) {
  if (isReadyTenantContextError(error)) {
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
        platformStatus: error.platformStatus,
      },
      { status: error.status },
    );
  }

  return NextResponse.json({ error: fallbackMessage }, { status: fallbackStatus });
}
