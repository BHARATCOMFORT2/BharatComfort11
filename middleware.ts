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
     1️⃣ ABSOLUTELY SKIP API & STATIC (NO MIDDLEWARE RUN)
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
     2️⃣ ALLOW PUBLIC ROUTES
  ----------------------------------------------------*/
  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    if (host === "bharatcomfort.online") {
      return NextResponse.redirect(
        new URL(
          `https://www.bharatcomfort.online${pathname}${request.nextUrl.search}`
        )
      );
    }
    return NextResponse.next();
  }

  /* ---------------------------------------------------
     3️⃣ FORCE DOMAIN (ONLY FOR REAL PAGES)
  ----------------------------------------------------*/
  if (host === "bharatcomfort.online") {
    return NextResponse.redirect(
      new URL(
        `https://www.bharatcomfort.online${pathname}${request.nextUrl.search}`
      )
    );
  }

  /* ---------------------------------------------------
     4️⃣ PROTECTED DASHBOARD ROUTES
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

/* ---------------------------------------------------
   🚨 MOST IMPORTANT PART
   ❌ DO NOT RUN MIDDLEWARE ON /api/*
----------------------------------------------------*/
export const config = {
  matcher: [
    /*
      Match all paths EXCEPT:
      - /api/*
      - _next
      - static files
    */
    "/((?!api|_next|static|favicon.ico|robots.txt|sitemap.xml|.*\\..*).*)",
  ],
};
