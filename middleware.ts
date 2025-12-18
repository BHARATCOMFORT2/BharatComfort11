// middleware.ts
import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get("host") || "";

  /* ---------------------------------------------------
     1️⃣ FORCE DOMAIN CONSISTENCY
  ----------------------------------------------------*/
  if (host === "bharatcomfort.online") {
    return NextResponse.redirect(
      new URL(`https://www.bharatcomfort.online${pathname}${request.nextUrl.search}`)
    );
  }

  /* ---------------------------------------------------
     2️⃣ SKIP STATIC FILES
  ----------------------------------------------------*/
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname.match(/\.(ico|png|jpg|jpeg|svg|css|js|woff2?|txt|xml)$/)
  ) {
    return NextResponse.next();
  }

  /* ---------------------------------------------------
     3️⃣ SKIP AUTH PAGES
  ----------------------------------------------------*/
  if (
    pathname.startsWith("/auth") ||
    pathname === "/admin/login" ||
    pathname === "/staff/login" ||
    pathname === "/staff/register"
  ) {
    return NextResponse.next();
  }

  /* ---------------------------------------------------
     4️⃣ NEVER TOUCH API ROUTES
     🔥 API AUTH IS HANDLED INSIDE API
  ----------------------------------------------------*/
  if (pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  /* ---------------------------------------------------
     5️⃣ PROTECTED PAGES ONLY
  ----------------------------------------------------*/
  const protectedPaths = [
    "/dashboard",
    "/user",
    "/partner",
    "/admin",
    "/staff",
    "/chat",
    "/book",
  ];

  const isProtected = protectedPaths.some((p) =>
    pathname.startsWith(p)
  );

  const session = request.cookies.get("__session")?.value;

  if (isProtected && !session) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

/* ---------------------------------------------------
   6️⃣ MATCHER
----------------------------------------------------*/
export const config = {
  matcher: ["/((?!_next|static|favicon.ico|robots.txt|sitemap.xml|.*\\..*).*)"],
};
