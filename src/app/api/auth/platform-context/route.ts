import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/auth/requireAuth";
import { resolvePlatformContext } from "@/server/platform/context";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
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

    const context = await resolvePlatformContext({ auth });
    const response = NextResponse.json({
      authenticated: true,
      ...context,
    });
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch {
    return NextResponse.json(
      {
        authenticated: false,
        error: "플랫폼 컨텍스트를 확인하지 못했습니다.",
      },
      { status: 500 },
    );
  }
}
