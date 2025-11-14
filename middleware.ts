// Force Node.js runtime
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // 🚫 Skip assets
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname.match(/\.(ico|png|jpg|jpeg|svg|css|js|woff2?|txt|xml)$/)
  ) {
    return NextResponse.next();
  }

  // 🚫 Skip ALL API routes (VERY IMPORTANT)
  if (pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  // 💰 Referral Code Capture
  const ref = request.nextUrl.searchParams.get("ref");
  if (ref && /^[a-zA-Z0-9_-]{4,20}$/.test(ref)) {
    const response = NextResponse.next();
    const expires = new Date();
    expires.setDate(expires.getDate() + 30);

    response.cookies.set("bc_referral_code", ref, {
      path: "/",
      expires,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      httpOnly: false,
    });

    return response;
  }

  // 🔐 Protected Routes
  const protectedPaths = ["/book", "/dashboard", "/partner", "/admin", "/chat"];
  const isProtected = protectedPaths.some((p) => pathname.startsWith(p));

  const sessionCookie =
    request.cookies.get("__session")?.value ||
    request.cookies.get("session")?.value ||
    "";

  // 🚨 Require login for protected pages
  if (isProtected && !sessionCookie) {
    const loginUrl = new URL(`/auth/login`, request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

/**
 * ⭐ FIXED MATCHER ⭐
 * This matcher ensures:
 * - API routes are NOT processed by middleware
 * - Assets and static files are skipped
 * - Only real pages are matched
 */
export const config = {
  matcher: [
    "/((?!_next|static|favicon.ico|robots.txt|sitemap.xml|api|.*\\..*).*)",
  ],
};
