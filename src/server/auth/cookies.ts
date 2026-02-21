import type { NextRequest, NextResponse } from "next/server";
import { getAuthSessionConfig } from "./config";

const TXN_MAX_AGE_SEC = 60 * 10;

export function getSessionIdFromRequest(request: NextRequest) {
  const { sessionCookieName } = getAuthSessionConfig();
  const value = request.cookies.get(sessionCookieName)?.value ?? "";
  return value.trim();
}

export function getTransactionFromRequest(request: NextRequest) {
  const { transactionCookieName } = getAuthSessionConfig();
  return request.cookies.get(transactionCookieName)?.value ?? "";
}

export function setSessionCookie(response: NextResponse, sessionId: string) {
  const { sessionCookieName, absoluteTtlSec, secureCookie } = getAuthSessionConfig();

  response.cookies.set(sessionCookieName, sessionId, {
    httpOnly: true,
    secure: secureCookie,
    sameSite: "lax",
    path: "/",
    maxAge: absoluteTtlSec,
  });
}

export function clearSessionCookie(response: NextResponse) {
  const { sessionCookieName, secureCookie } = getAuthSessionConfig();

  response.cookies.set(sessionCookieName, "", {
    httpOnly: true,
    secure: secureCookie,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export function setTransactionCookie(response: NextResponse, value: string) {
  const { transactionCookieName, secureCookie } = getAuthSessionConfig();

  response.cookies.set(transactionCookieName, value, {
    httpOnly: true,
    secure: secureCookie,
    sameSite: "lax",
    path: "/",
    maxAge: TXN_MAX_AGE_SEC,
  });
}

export function clearTransactionCookie(response: NextResponse) {
  const { transactionCookieName, secureCookie } = getAuthSessionConfig();

  response.cookies.set(transactionCookieName, "", {
    httpOnly: true,
    secure: secureCookie,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
