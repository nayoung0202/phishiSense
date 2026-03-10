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

type PlatformContextMiddlewarePayload = {
  authenticated: boolean;
  hasAccess: boolean;
  onboardingRequired: boolean;
  status: string;
};

const getPlatformContext = async (
  request: NextRequest,
): Promise<PlatformContextMiddlewarePayload | null> => {
  const sessionUrl = new URL(
    "/api/auth/platform-context",
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

    if (!validationResponse.ok) {
      return null;
    }

    return (await validationResponse.json()) as PlatformContextMiddlewarePayload;
  } catch {
    return null;
  }
};

const redirectToOnboarding = (request: NextRequest, reason: string) => {
  const onboardingUrl = new URL("/onboarding", getAppOrigin());
  const returnTo = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  onboardingUrl.searchParams.set("reason", reason);
  if (returnTo && returnTo !== "/onboarding") {
    onboardingUrl.searchParams.set("returnTo", returnTo);
  }
  return NextResponse.redirect(onboardingUrl);
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

  const platformContext = await getPlatformContext(request);
  if (!platformContext || !platformContext.authenticated) {
    return isApiPath ? unauthorizedApiResponse() : redirectToLogin(request);
  }

  if (pathname === "/onboarding" || pathname.startsWith("/onboarding/")) {
    if (platformContext.hasAccess && !platformContext.onboardingRequired) {
      return NextResponse.redirect(new URL("/", getAppOrigin()));
    }
    return NextResponse.next();
  }

  if (!platformContext.hasAccess || platformContext.onboardingRequired) {
    if (isApiPath) {
      return NextResponse.json(
        {
          error: "Forbidden",
          reason: platformContext.status,
        },
        { status: 403 },
      );
    }
    return redirectToOnboarding(request, platformContext.status);
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
