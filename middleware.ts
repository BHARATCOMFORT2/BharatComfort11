// middleware.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const host = request.headers.get("host") || "";

  /* 1) Force www domain */
  if (host === "bharatcomfort.online") {
    return NextResponse.redirect(
      `https://www.bharatcomfort.online${pathname}${request.nextUrl.search}`
    );
  }

  /* 2) Skip files */
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname.match(/\.(ico|png|jpg|jpeg|svg|css|js|woff2?|txt|xml)$/)
  ) {
    return NextResponse.next();
  }

  /* 3) UNIVERSAL API FIX — add __session to headers */
  if (pathname.startsWith("/api")) {
    const sessionCookie =
      request.cookies.get("__session")?.value ||
      request.cookies.get("session")?.value ||
      request.cookies.get("firebase_session")?.value ||
      "";

    if (!sessionCookie) return NextResponse.next();

    const newHeaders = new Headers(request.headers);
    const existing = request.headers.get("cookie") || "";

    const updatedCookie = existing.includes("__session=")
      ? existing.replace(/__session=[^;]+/, `__session=${sessionCookie}`)
      : `__session=${sessionCookie}; ${existing}`;

    newHeaders.set("cookie", updatedCookie);

    return NextResponse.next({
      request: { headers: newHeaders },
    });
  }

  /* 4) Skip /auth */
  if (pathname.startsWith("/auth")) return NextResponse.next();

  /* 5) Referral capture */
  const ref = request.nextUrl.searchParams.get("ref");
  if (ref && /^[a-zA-Z0-9_-]{4,20}$/.test(ref)) {
    const response = NextResponse.next();
    response.cookies.set("bc_referral_code", ref, {
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
      httpOnly: false,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      domain: ".bharatcomfort.online",
    });
    return response;
  }

  /* 6) Protected areas */
  const protectedPaths = [
    "/dashboard",
    "/partner/dashboard",
    "/admin",
    "/chat",
    "/book",
  ];
  const isProtected = protectedPaths.some((p) => pathname.startsWith(p));

  // Allow partner KYC flow
  if (pathname.startsWith("/partner/dashboard/kyc")) {
    return NextResponse.next();
  }

  /* 7) Validate session for protected areas */
  const cookieSession =
    request.cookies.get("__session")?.value ||
    request.cookies.get("session")?.value ||
    request.cookies.get("firebase_session")?.value ||
    "";

  const bearer = request.headers.get("authorization") || "";
  const token = bearer.startsWith("Bearer ") ? bearer.slice(7) : "";

  const isAuthenticated = cookieSession || token;

  if (isProtected && !isAuthenticated) {
    const loginUrl = new URL(`/auth/login`, request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next|static|favicon.ico|robots.txt|sitemap.xml|api|auth|.*\\..*).*)",
  ],
};
