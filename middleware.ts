export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // 🚫 Skip assets & API
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname.startsWith("/api") ||
    pathname.match(/\.(ico|png|jpg|jpeg|svg|css|js|woff2?|txt|xml)$/)
  ) {
    return NextResponse.next();
  }

  // 💰 Referral Code
  const refFromQuery = request.nextUrl.searchParams.get("ref");
  if (refFromQuery && /^[a-zA-Z0-9_-]{4,20}$/.test(refFromQuery)) {
    const response = NextResponse.next();
    const expires = new Date();
    expires.setDate(expires.getDate() + 30);
    response.cookies.set("bc_referral_code", refFromQuery, {
      path: "/",
      expires,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      httpOnly: false,
    });
    return response;
  }

  // 🔐 Auth check
  const protectedPaths = ["/book", "/dashboard", "/partner", "/admin", "/chat"];
  const isProtected = protectedPaths.some((p) => pathname.startsWith(p));

  const sessionCookie =
    request.cookies.get("__session")?.value ||
    request.cookies.get("session")?.value ||
    "";

  if (isProtected && !sessionCookie) {
    const loginUrl = new URL(`/auth/login`, request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|favicon.ico|api|static|.*\\..*).*)"],
};
