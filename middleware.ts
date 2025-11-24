// middleware.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const host = request.headers.get("host") || "";

  /* ---------------------------------------------------
     1️⃣ FORCE DOMAIN CONSISTENCY
  ----------------------------------------------------*/
  if (host === "bharatcomfort.online") {
    return NextResponse.redirect(
      `https://www.bharatcomfort.online${pathname}${request.nextUrl.search}`
    );
  }

  /* ---------------------------------------------------
     2️⃣ SKIP STATIC / PUBLIC FILES
  ----------------------------------------------------*/
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname.match(/\.(ico|png|jpg|jpeg|svg|css|js|woff2?|txt|xml)$/)
  ) {
    return NextResponse.next();
  }

  /* ---------------------------------------------------
     3️⃣ SKIP API ROUTES
  ----------------------------------------------------*/
  if (pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  /* ---------------------------------------------------
     4️⃣ SKIP AUTH ROUTES
  ----------------------------------------------------*/
  if (pathname.startsWith("/auth")) {
    return NextResponse.next();
  }

  /* ---------------------------------------------------
     5️⃣ CAPTURE REFERRAL CODE
  ----------------------------------------------------*/
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

  /* ---------------------------------------------------
     6️⃣ PROTECTED ROUTES (SAFE VERSION)
  ----------------------------------------------------*/
  const protectedPaths = [
    "/dashboard",
    "/partner/dashboard",  // STRICT — does NOT block /partner/dashboard/kyc
    "/admin",
    "/chat",
    "/book",
  ];

  const isProtected = protectedPaths.some((p) =>
    pathname.startsWith(p)
  );

  // FIX: Do not block KYC onboarding
  if (pathname.startsWith("/partner/dashboard/kyc")) {
    return NextResponse.next();
  }

  /* ---------------------------------------------------
     SESSION COOKIE FIX
  ----------------------------------------------------*/
  const cookieSession =
    request.cookies.get("session")?.value ||
    request.cookies.get("__session")?.value ||
    request.cookies.get("firebase_session")?.value ||
    "";

  const authHeader = request.headers.get("authorization") || "";
  const bearerToken = authHeader.startsWith("Bearer ")
    ? authHeader.substring(7)
    : "";

  const isAuthenticated = cookieSession || bearerToken;

  if (isProtected && !isAuthenticated) {
    const loginUrl = new URL(`/auth/login`, request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

/* ---------------------------------------------------
   MATCHER — FIXED
----------------------------------------------------*/
export const config = {
  matcher: [
    "/((?!_next|static|favicon.ico|robots.txt|sitemap.xml|api|auth|.*\\..*).*)",
  ],
};
