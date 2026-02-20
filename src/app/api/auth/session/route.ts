import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/auth/requireAuth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth) {
      const response = NextResponse.json(
        {
          authenticated: false,
        },
        { status: 401 },
      );
      response.headers.set("Cache-Control", "no-store");
      return response;
    }

    const response = NextResponse.json({
      authenticated: true,
      user: auth.user,
      idleExpiresAt: auth.idleExpiresAt,
      absoluteExpiresAt: auth.absoluteExpiresAt,
    });
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch {
    return NextResponse.json(
      {
        authenticated: false,
        error: "세션 상태 확인에 실패했습니다.",
      },
      { status: 500 },
    );
  }
}
