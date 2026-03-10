import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/server/auth/requireAuth";
import {
  PlatformContextSelectionError,
  selectPlatformTenant,
} from "@/server/platform/context";
import { PlatformApiError } from "@/server/platform/client";

export const runtime = "nodejs";

const bodySchema = z.object({
  tenantId: z.string().trim().min(1, "tenantId가 필요합니다."),
});

export async function PATCH(request: NextRequest) {
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

    const payload = bodySchema.parse(await request.json());
    const context = await selectPlatformTenant({
      auth,
      tenantId: payload.tenantId,
    });

    return NextResponse.json({
      authenticated: true,
      ...context,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "tenant 선택 요청이 올바르지 않습니다.",
          issues: error.issues,
        },
        { status: 422 },
      );
    }

    if (error instanceof PlatformContextSelectionError) {
      return NextResponse.json(
        {
          error: error.message,
        },
        { status: error.status },
      );
    }

    if (error instanceof PlatformApiError) {
      return NextResponse.json(
        {
          error: error.message,
        },
        { status: error.status },
      );
    }

    return NextResponse.json(
      {
        error: "tenant 컨텍스트를 선택하지 못했습니다.",
      },
      { status: 500 },
    );
  }
}
