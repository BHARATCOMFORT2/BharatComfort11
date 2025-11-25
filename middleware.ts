// middleware.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
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
     3️⃣ UNIVERSAL API FIX — INJECT __session INTO HEADERS
  ----------------------------------------------------*/
  if (pathname.startsWith("/api")) {
    const sessionCookie =
      request.cookies.get("__session")?.value ||
      request.cookies.get("session")?.value ||
      request.cookies.get("firebase_session")?.value ||
      "";

    if (!sessionCookie) {
      return NextResponse.next();
    }

    const newHeaders = new Headers(request.headers);
    const existingCookie = request.headers.get("cookie") || "";

    const updatedCookie = existingCookie.includes("__session=")
      ? existingCookie.replace(/__session=[^;]+/, `__session=${sessionCookie}`)
      : `__session=${sessionCookie}; ${existingCookie}`;

    newHeaders.set("cookie", updatedCookie);

    return NextResponse.next({
      request: {
        headers: newHeaders,
      },
    });
  }

  /* ---------------------------------------------------
     4️⃣ SKIP AUTH ROUTES
  ----------------------------------------------------*/
  if (pathname.startsWith("/auth")) {
    return NextResponse.next();
  }

  /* ---------------------------------------------------
     5️⃣ CAPTURE REFERRAL CODE
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
     6️⃣ PROTECTED ROUTES (General)
  ----------------------------------------------------*/
  const protectedPaths = [
    "/dashboard",
    "/partner/dashboard",
    "/admin",
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

  const isAuthenticated = cookieSession || bearerToken;

  if (isProtected && !isAuthenticated) {
    const loginUrl = new URL(`/auth/login`, request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  /* ---------------------------------------------------
     7️⃣ PARTNER KYC FORCED FLOW
     Partners CANNOT access dashboard until:
     - KYC submitted
     - Admin approved
  ----------------------------------------------------*/
  if (pathname.startsWith("/partner/dashboard")) {
    try {
      const profileRes = await fetch(request.nextUrl.origin + "/api/partners/profile", {
        headers: {
          cookie: request.headers.get("cookie") || "",
        },
      });

      const profile = await profileRes.json();
      const kyc = (profile.kycStatus || "NOT_STARTED").toUpperCase();

      // Force KYC Submission before accessing dashboard
      if (kyc === "NOT_STARTED" || kyc === "NOT_CREATED") {
        return NextResponse.redirect(
          new URL("/partner/dashboard/kyc", request.url)
        );
      }

      // Under Review
      if (kyc === "UNDER_REVIEW" || kyc === "SUBMITTED") {
        return NextResponse.redirect(
          new URL("/partner/dashboard/kyc/pending", request.url)
        );
      }

      // Rejected → resubmit
      if (kyc === "REJECTED") {
        return NextResponse.redirect(
          new URL("/partner/dashboard/kyc?resubmit=1", request.url)
        );
      }

      // APPROVED → allow dashboard access
    } catch (err) {
      console.error("KYC Middleware Error:", err);
      return NextResponse.redirect(new URL("/auth/login", request.url));
    }
  }

  return NextResponse.next();
}

/* ---------------------------------------------------
   8️⃣ MATCHER
----------------------------------------------------*/
export const config = {
  matcher: [
    "/((?!_next|static|favicon.ico|robots.txt|sitemap.xml|api|auth|.*\\..*).*)",
  ],
};
