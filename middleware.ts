// middleware.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const host = request.headers.get("host") || "";

  /* -------------------------------
     1️⃣ FORCE DOMAIN CONSISTENCY
     Redirect root → www
  --------------------------------*/
  if (host === "bharatcomfort.online") {
    return NextResponse.redirect(
      `https://www.bharatcomfort.online${pathname}${request.nextUrl.search}`
    );
  }

  /* -------------------------------
     2️⃣ SKIP STATIC / PUBLIC FILES
  --------------------------------*/
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname.match(/\.(ico|png|jpg|jpeg|svg|css|js|woff2?|txt|xml)$/)
  ) {
    return NextResponse.next();
  }

  /* -------------------------------
     3️⃣ SKIP ALL API ROUTES
  --------------------------------*/
  if (pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  /* -------------------------------
     4️⃣ SKIP AUTH ROUTES
  --------------------------------*/
  if (pathname.startsWith("/auth")) {
    return NextResponse.next();
  }

  /* -------------------------------
     5️⃣ CAPTURE REFERRAL CODE
  --------------------------------*/
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

  /* -------------------------------
     6️⃣ PROTECTED ROUTES
  --------------------------------*/
  const protectedPaths = [
    "/dashboard",
    "/partner",
    "/admin",
    "/chat",
    "/book",
  ];
  const isProtected = protectedPaths.some((p) => pathname.startsWith(p));

  const sessionCookie =
    request.cookies.get("__session")?.value || "";

  if (isProtected && !sessionCookie) {
    const loginUrl = new URL(`/auth/login`, request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

/* -------------------------------
   MATCHER — only run on real pages
--------------------------------*/
export const config = {
  matcher: [
    "/((?!_next|static|favicon.ico|robots.txt|sitemap.xml|api|auth|.*\\..*).*)",
  ],
};
