import { NextRequest, NextResponse } from "next/server";
import {
  getAuthDevBypassConfig,
  getSessionCookieName,
} from "@/server/auth/config";
import { getAppOrigin } from "@/server/auth/redirect";

const PROTECTED_PAGE_PREFIXES = [
  "/projects",
  "/targets",
  "/templates",
  "/training-pages",
  "/admin",
  "/onboarding",
];

/** 인증 없이 접근 가능한 페이지 경로 */
const PUBLIC_PAGE_PATHS = ["/login"];

const isProtectedPagePath = (pathname: string) => {
  if (pathname === "/") return true;
  return PROTECTED_PAGE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
};

const isPublicPagePath = (pathname: string) =>
  PUBLIC_PAGE_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

const isAuthApiPath = (pathname: string) => pathname.startsWith("/api/auth/");

const unauthorizedApiResponse = () =>
  NextResponse.json(
    {
      error: "Unauthorized",
    },
    { status: 401 },
  );

const redirectToLogin = (request: NextRequest) => {
  const loginUrl = new URL("/login", getAppOrigin());
  const returnTo = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  if (returnTo && returnTo !== "/") {
    loginUrl.searchParams.set("returnTo", returnTo);
  }
  return NextResponse.redirect(loginUrl);
};

const getSessionCheckOrigin = (request: NextRequest) => {
  const override = process.env.AUTH_SESSION_CHECK_ORIGIN?.trim();
  if (override) return override;

  const forwardedProto = request.headers.get("x-forwarded-proto");
  const forwardedHost = request.headers.get("x-forwarded-host");
  if (forwardedProto && forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  return request.nextUrl.origin;
};

const hasValidSession = async (request: NextRequest) => {
  const sessionUrl = new URL(
    "/api/auth/session",
    getSessionCheckOrigin(request),
  );

  try {
    const validationResponse = await fetch(sessionUrl, {
      method: "GET",
      cache: "no-store",
      headers: {
        cookie: request.headers.get("cookie") ?? "",
      },
    });

    return validationResponse.ok;
  } catch {
    return false;
  }
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isApiPath = pathname.startsWith("/api/");
  const isProtectedPage = isProtectedPagePath(pathname);
  const isPublicPage = isPublicPagePath(pathname);

  // 공개 페이지는 그대로 통과
  if (isPublicPage) {
    return NextResponse.next();
  }

  if (!isApiPath && !isProtectedPage) {
    return NextResponse.next();
  }

  if (isApiPath && isAuthApiPath(pathname)) {
    return NextResponse.next();
  }

  if (getAuthDevBypassConfig().enabled) {
    return NextResponse.next();
  }

  const cookieName = getSessionCookieName();
  const sessionCookie = request.cookies.get(cookieName)?.value?.trim();

  if (!sessionCookie) {
    return isApiPath ? unauthorizedApiResponse() : redirectToLogin(request);
  }

  const valid = await hasValidSession(request);
  if (!valid) {
    return isApiPath ? unauthorizedApiResponse() : redirectToLogin(request);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/onboarding/:path*",
    "/projects/:path*",
    "/targets/:path*",
    "/templates/:path*",
    "/training-pages/:path*",
    "/admin/:path*",
    "/api/:path*",
  ],
};
