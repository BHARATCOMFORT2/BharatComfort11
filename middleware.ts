// middleware.ts
import { NextRequest, NextResponse } from "next/server";

const PUBLIC_ROUTES = [
  "/",
  "/auth",
  "/auth/login",
  "/auth/register",

  "/partner/register",
  "/partner/login",

  "/staff/login",
  "/staff/register",

  "/admin/login",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get("host") || "";

  /* ---------------------------------------------------
     1️⃣ NEVER TOUCH API & STATIC
  ----------------------------------------------------*/
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname.match(/\.(ico|png|jpg|jpeg|svg|css|js|woff2?|txt|xml)$/)
  ) {
    return NextResponse.next();
  }

  /* ---------------------------------------------------
     2️⃣ ALLOW PUBLIC ROUTES (NO AUTH, NO REDIRECT)
  ----------------------------------------------------*/
  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    // 👉 domain redirect yahin safe hai
    if (host === "bharatcomfort.online") {
      return NextResponse.redirect(
        new URL(`https://www.bharatcomfort.online${pathname}${request.nextUrl.search}`)
      );
    }
    return NextResponse.next();
  }

  /* ---------------------------------------------------
     3️⃣ FORCE DOMAIN (ONLY FOR REAL PAGES)
  ----------------------------------------------------*/
  if (host === "bharatcomfort.online") {
    return NextResponse.redirect(
      new URL(`https://www.bharatcomfort.online${pathname}${request.nextUrl.search}`)
    );
  }

  /* ---------------------------------------------------
     4️⃣ PROTECTED DASHBOARD ONLY
  ----------------------------------------------------*/
  const protectedPaths = [
    "/dashboard",
    "/user/dashboard",
    "/partner/dashboard",
    "/staff/dashboard",
    "/admin/dashboard",
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

export const config = {
  matcher: ["/((?!_next|static|favicon.ico|robots.txt|sitemap.xml|.*\\..*).*)"],
};
