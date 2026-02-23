import { NextRequest, NextResponse } from "next/server";
import { getAuthDevBypassConfig, getSessionCookieName } from "@/server/auth/config";

const PROTECTED_PAGE_PREFIXES = [
  "/projects",
  "/targets",
  "/templates",
  "/training-pages",
  "/admin",
];

const isProtectedPagePath = (pathname: string) => {
  if (pathname === "/") return true;
  return PROTECTED_PAGE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
};

const isAuthApiPath = (pathname: string) => pathname.startsWith("/api/auth/");

const unauthorizedApiResponse = () =>
  NextResponse.json(
    {
      error: "Unauthorized",
    },
    { status: 401 },
  );

const redirectToOidcLogin = (request: NextRequest) => {
  const loginUrl = new URL("/api/auth/oidc/login", request.url);
  const returnTo = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  loginUrl.searchParams.set("returnTo", returnTo || "/");
  return NextResponse.redirect(loginUrl);
};

const hasValidSession = async (request: NextRequest) => {
  const sessionUrl = new URL("/api/auth/session", request.url);

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
    return isApiPath ? unauthorizedApiResponse() : redirectToOidcLogin(request);
  }

  const valid = await hasValidSession(request);
  if (!valid) {
    return isApiPath ? unauthorizedApiResponse() : redirectToOidcLogin(request);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/projects/:path*",
    "/targets/:path*",
    "/templates/:path*",
    "/training-pages/:path*",
    "/admin/:path*",
    "/api/:path*",
  ],
};
