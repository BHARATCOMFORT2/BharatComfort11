import { NextRequest, NextResponse } from "next/server";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { i18n } from "./app/i18n/settings";

/* ============================================================
   🧩 Firebase Admin Initialization (Server-Safe)
============================================================ */
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

/* ============================================================
   🌐 Locale Detection Helper
============================================================ */
function getLocale(request: NextRequest): string {
  const { locales, defaultLocale } = i18n;
  const pathLocale = request.nextUrl.pathname.split("/")[1];
  if (locales.includes(pathLocale)) return pathLocale;

  const acceptLang = request.headers.get("accept-language") || "";
  const detected = locales.find((l) => acceptLang.toLowerCase().includes(l));
  return detected || defaultLocale;
}

/* ============================================================
   🔐 Middleware: Locale + Auth + Role + Referral
============================================================ */
export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const locale = getLocale(request);

  const REF_COOKIE = "bc_referral_code";
  const REF_COOKIE_TTL_DAYS = 30;
  const refFromQuery = request.nextUrl.searchParams.get("ref");
  const response = NextResponse.next();

  /* --------------------------------------------------
     🚫 Skip middleware for static / API / public files
  -------------------------------------------------- */
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname.match(/\.(ico|png|jpg|jpeg|svg|css|js|woff2?|txt|xml)$/) ||
    pathname.startsWith("/api") ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml"
  ) {
    return NextResponse.next();
  }

  /* --------------------------------------------------
     🌍 Locale enforcement (auto-redirect)
  -------------------------------------------------- */
  if (!i18n.locales.some((loc) => pathname.startsWith(`/${loc}`))) {
    return NextResponse.redirect(new URL(`/${locale}${pathname}`, request.url));
  }

  /* --------------------------------------------------
     💰 Referral Code Handling
  -------------------------------------------------- */
  if (refFromQuery && /^[a-zA-Z0-9_-]{4,20}$/.test(refFromQuery)) {
    const expires = new Date();
    expires.setDate(expires.getDate() + REF_COOKIE_TTL_DAYS);
    response.cookies.set(REF_COOKIE, refFromQuery, {
      path: "/",
      expires,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      httpOnly: false,
    });
  }

  /* --------------------------------------------------
     🔐 Auth Enforcement + Role Control
  -------------------------------------------------- */
  const protectedPaths = ["/book", "/dashboard", "/partner", "/admin", "/chat"];
  const isProtected = protectedPaths.some((p) => pathname.includes(p));
  const sessionCookie = request.cookies.get("session")?.value || "";

  // If no session and protected route → redirect to login
  if (isProtected && !sessionCookie) {
    const loginUrl = new URL(`/${locale}/auth/login`, request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Verify Firebase session (direct Admin SDK)
  if (sessionCookie) {
    try {
      const decoded = await getAuth().verifySessionCookie(sessionCookie, true);
      const role = decoded.role || "user";

      // Role-based dashboards
      if (pathname.startsWith(`/${locale}/admin`) && role !== "admin") {
        return NextResponse.redirect(
          new URL(`/${locale}/(dashboard)/user`, request.url)
        );
      }

      if (pathname.startsWith(`/${locale}/partner`) && role !== "partner") {
        return NextResponse.redirect(
          new URL(`/${locale}/(dashboard)/user`, request.url)
        );
      }

      // Non-logged-in fallback handled above
      return response;
    } catch (error) {
      console.error("🔥 Invalid Firebase session:", error);
      const loginUrl = new URL(`/${locale}/auth/login`, request.url);
      loginUrl.searchParams.set("redirect", pathname);
      const r = NextResponse.redirect(loginUrl);
      r.cookies.delete("session");
      return r;
    }
  }

  /* --------------------------------------------------
     ✅ Default: Allow normal browsing
  -------------------------------------------------- */
  return response;
}

/* ============================================================
   ⚙️ Middleware Matcher Configuration
============================================================ */
export const config = {
  matcher: ["/((?!_next|.*\\..*|api).*)"],
};
