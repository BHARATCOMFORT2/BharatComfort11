// Force Node.js runtime
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // 🚫 Skip static assets
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname.match(/\.(ico|png|jpg|jpeg|svg|css|js|woff2?|txt|xml)$/)
  ) {
    return NextResponse.next();
  }

  // 🚫 Skip ALL API routes
  if (pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  // 🚫 Skip auth pages (prevents forced logout on refresh)
  if (pathname.startsWith("/auth")) {
    return NextResponse.next();
  }

  // 💰 Capture referral code
  const ref = request.nextUrl.searchParams.get("ref");
  if (ref && /^[a-zA-Z0-9_-]{4,20}$/.test(ref)) {
    const response = NextResponse.next();
    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    response.cookies.set("bc_referral_code", ref, {
      path: "/",
      expires,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      httpOnly: false,
    });

    return response;
  }

  // 🔐 Protected Pages
  const protectedPaths = ["/book", "/dashboard", "/partner", "/admin", "/chat"];
  const isProtected = protectedPaths.some((p) => pathname.startsWith(p));

  // 🔑 MUST ONLY READ __session
  const sessionCookie = request.cookies.get("__session")?.value || "";

  // 🚨 Require login
  if (isProtected && !sessionCookie) {
    const loginUrl = new URL(`/auth/login`, request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

/**
 * ⭐ CORRECT MATCHER ⭐
 * - Never touch APIs
 * - Never touch static files
 * - Never touch auth routes
 */
export const config = {
  matcher: [
    "/((?!_next|static|favicon.ico|robots.txt|sitemap.xml|api|auth|.*\\..*).*)",
  ],
};
