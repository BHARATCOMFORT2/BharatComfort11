// middleware.ts
import { NextRequest, NextResponse } from "next/server";

/* ---------------------------------------
   PUBLIC ROUTES
--------------------------------------- */
const PUBLIC_ROUTES = [
  "/",
  "/auth",
  "/auth/login",
  "/auth/register",

  "/partner/login",
  "/partner/register",

  "/staff/login",
  "/staff/register",

  "/admin/login",
];

/* ---------------------------------------
   PROTECTED ROUTE PREFIXES
--------------------------------------- */
const PROTECTED_PREFIXES = [
  "/user",
  "/partner",
  "/staff",
  "/admin",
  "/chat",
  "/book",
];

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const host = request.headers.get("host") || "";

  /* ---------------------------------------------------
     1️⃣ SKIP API & STATIC FILES
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
     2️⃣ FORCE WWW DOMAIN
  ----------------------------------------------------*/
  if (host === "bharatcomfort.online") {
    return NextResponse.redirect(
      new URL(`https://www.bharatcomfort.online${pathname}${search}`)
    );
  }

  /* ---------------------------------------------------
     3️⃣ CHECK SESSION COOKIE
  ----------------------------------------------------*/
  const session = request.cookies.get("__session")?.value;

  /* ---------------------------------------------------
     4️⃣ BLOCK AUTH PAGES IF ALREADY LOGGED IN
  ----------------------------------------------------*/
  if (session && pathname.startsWith("/auth")) {
    return NextResponse.redirect(new URL("/user/dashboard", request.url));
  }

  /* ---------------------------------------------------
     5️⃣ ALLOW PUBLIC ROUTES
  ----------------------------------------------------*/
  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  /* ---------------------------------------------------
     6️⃣ PROTECT DASHBOARDS
  ----------------------------------------------------*/
  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );

  if (isProtected && !session) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

/* ---------------------------------------------------
   MATCHER CONFIG
----------------------------------------------------*/
export const config = {
  matcher: [
    "/((?!api|_next|static|favicon.ico|robots.txt|sitemap.xml|.*\\..*).*)",
  ],
};
