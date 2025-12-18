// middleware.ts
import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
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
     3️⃣ SKIP AUTH PAGES (VERY IMPORTANT)
     🔥 ADMIN LOGIN MUST BE SKIPPED
  ----------------------------------------------------*/
  if (
    pathname.startsWith("/auth") ||
    pathname.startsWith("/admin/login") ||
    pathname.startsWith("/admin/register") ||
    pathname.startsWith("/admin/forgot") ||
    pathname.startsWith("/staff/login") ||
    pathname.startsWith("/staff/register")
  ) {
    return NextResponse.next();
  }

  /* ---------------------------------------------------
     4️⃣ UNIVERSAL API COOKIE INJECTION
  ----------------------------------------------------*/
  if (pathname.startsWith("/api")) {
    const sessionCookie =
      request.cookies.get("__session")?.value ||
      request.cookies.get("session")?.value ||
      request.cookies.get("firebase_session")?.value ||
      "";

    if (sessionCookie) {
      const newHeaders = new Headers(request.headers);
      const existingCookie = request.headers.get("cookie") || "";

      const updatedCookie = existingCookie.includes("__session=")
        ? existingCookie.replace(
            /__session=[^;]+/,
            `__session=${sessionCookie}`
          )
        : `__session=${sessionCookie}; ${existingCookie}`;

      newHeaders.set("cookie", updatedCookie);

      return NextResponse.next({
        request: { headers: newHeaders },
      });
    }

    return NextResponse.next();
  }

  /* ---------------------------------------------------
     5️⃣ REFERRAL CAPTURE (PUBLIC)
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
     6️⃣ PROTECTED ROUTES
  ----------------------------------------------------*/
  const protectedPaths = [
    "/dashboard",
    "/user",
    "/partner",
    "/admin", // ❗ admin dashboard only (login already skipped)
    "/staff",
    "/chat",
    "/book",
  ];

  const isProtected = protectedPaths.some((p) =>
    pathname.startsWith(p)
  );

  const cookieSession =
    request.cookies.get("__session")?.value ||
    request.cookies.get("session")?.value ||
    request.cookies.get("firebase_session")?.value ||
    "";

  const authHeader = request.headers.get("authorization") || "";
  const bearerToken = authHeader.startsWith("Bearer ")
    ? authHeader.substring(7)
    : "";

  const isAuthenticated = Boolean(cookieSession || bearerToken);

  if (isProtected && !isAuthenticated) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

/* ---------------------------------------------------
   7️⃣ MATCHER
----------------------------------------------------*/
export const config = {
  matcher: [
    "/((?!_next|static|favicon.ico|robots.txt|sitemap.xml|.*\\..*).*)",
  ],
};
