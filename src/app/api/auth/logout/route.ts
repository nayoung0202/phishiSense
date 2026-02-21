import { NextRequest, NextResponse } from "next/server";
import {
  clearSessionCookie,
  clearTransactionCookie,
  getSessionIdFromRequest,
} from "@/server/auth/cookies";
import { revokeAuthSession } from "@/server/auth/sessionStore";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const sessionId = getSessionIdFromRequest(request);

  if (sessionId) {
    await revokeAuthSession(sessionId);
  }

  const response = NextResponse.json({ ok: true });
  clearSessionCookie(response);
  clearTransactionCookie(response);
  return response;
}
