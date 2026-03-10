import { NextResponse } from "next/server";
import { z } from "zod";
import { processPlatformEntitlementCallback } from "@/server/platform/entitlementService";
import { PlatformCallbackError } from "@/server/platform/signature";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const result = await processPlatformEntitlementCallback({
      body,
      headers: request.headers,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof PlatformCallbackError) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
        },
        { status: error.status },
      );
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Platform callback payload 검증에 실패했습니다.",
          issues: error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        },
        { status: 422 },
      );
    }

    return NextResponse.json(
      {
        error: "Platform entitlement callback 처리에 실패했습니다.",
      },
      { status: 500 },
    );
  }
}
