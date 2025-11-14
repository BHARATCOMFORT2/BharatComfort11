// Force Node.js runtime
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // -------------------------------------------------------
  // 1️⃣ Skip static assets
  // -------------------------------------------------------
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname.match(/\.(ico|png|jpg|jpeg|svg|css|js|woff2?|txt|xml)$/)
  ) {
    return NextResponse.next();
  }

  // -------------------------------------------------------
  // 2️⃣ Skip ALL API routes
  // -------------------------------------------------------
  if (pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  // -------------------------------------------------------
  // 3️⃣ Skip PUBLIC auth pages
  // DO NOT skip all of /auth !
  // -------------------------------------------------------
  if (
    pathname.startsWith("/auth/login") ||
    pathname.startsWith("/auth/register") ||
    pathname.startsWith("/auth/verify")
  ) {
    return NextResponse.next();
  }

  // -------------------------------------------------------
  // 4️⃣ Referral Code Capture
  // -------------------------------------------------------
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

  // -------------------------------------------------------
  // 5️⃣ Protected routes
  // -------------------------------------------------------
  const protectedPaths = ["/book", "/dashboard", "/partner", "/admin", "/chat"];
  const isProtected = protectedPaths.some((p) => pathname.startsWith(p));

  // MUST only read "__session" cookie
  const sessionCookie = request.cookies.get("__session")?.value || "";

  // -------------------------------------------------------
  // 6️⃣ Require login for protected pages
  // -------------------------------------------------------
  if (isProtected && !sessionCookie) {
    const loginUrl = new URL(`/auth/login`, request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next|static|favicon.ico|robots.txt|sitemap.xml|api|.*\\..*).*)",
  ],
};
