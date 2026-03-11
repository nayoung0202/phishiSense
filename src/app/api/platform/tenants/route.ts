import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/server/auth/requireAuth";
import { setAuthSessionTenant } from "@/server/auth/sessionStore";
import { createPlatformTenant, PlatformApiError } from "@/server/platform/client";
import { resolvePlatformContext } from "@/server/platform/context";

export const runtime = "nodejs";

const bodySchema = z.object({
  name: z.string().trim().min(1, "회사 또는 조직 이름을 입력해 주세요."),
});

const toCreateTenantError = (status: number) => {
  switch (status) {
    case 400:
      return "회사 또는 조직 이름을 다시 확인해 주세요.";
    case 401:
      return "로그인 정보를 확인하지 못했습니다. 다시 로그인해 주세요.";
    case 403:
      return "회사 또는 조직을 생성할 권한이 없습니다.";
    case 409:
      return "이미 사용 중인 이름이거나 요청이 충돌했습니다. 다른 이름으로 다시 시도해 주세요.";
    default:
      return "회사 또는 조직을 생성하지 못했습니다. 잠시 후 다시 시도해 주세요.";
  }
};

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth) {
      return NextResponse.json(
        {
          authenticated: false,
        },
        { status: 401 },
      );
    }

    if (!auth.accessToken) {
      return NextResponse.json(
        {
          error: "로그인 정보를 확인하지 못했습니다. 다시 로그인해 주세요.",
        },
        { status: 400 },
      );
    }

    const payload = bodySchema.parse(await request.json());
    const createdTenant = await createPlatformTenant({
      accessToken: auth.accessToken,
      name: payload.name,
    });

    await setAuthSessionTenant(auth.sessionId, createdTenant.tenantId);

    const context = await resolvePlatformContext({
      auth: {
        ...auth,
        tenantId: createdTenant.tenantId,
      },
      preferredTenantId: createdTenant.tenantId,
      forceRefresh: true,
    });

    return NextResponse.json(
      {
        authenticated: true,
        createdTenant,
        ...context,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "회사 또는 조직 이름을 확인해 주세요.",
          issues: error.issues,
        },
        { status: 422 },
      );
    }

    if (error instanceof PlatformApiError) {
      return NextResponse.json(
        {
          error: toCreateTenantError(error.status),
        },
        { status: error.status },
      );
    }

    return NextResponse.json(
      {
        error: "회사 또는 조직을 생성하지 못했습니다. 잠시 후 다시 시도해 주세요.",
      },
      { status: 500 },
    );
  }
}
