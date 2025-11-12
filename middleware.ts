// ✅ Force Node.js runtime (disable edge/static optimization)
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

// middleware.ts
import { NextRequest, NextResponse } from "next/server";
import { i18n } from "./app/i18n/settings";

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
     🚫 Skip middleware for static / API / assets
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
     🌍 Locale Enforcement (auto-redirect)
  -------------------------------------------------- */
  if (!i18n.locales.some((loc) => pathname.startsWith(`/${loc}`))) {
    return NextResponse.redirect(new URL(`/${locale}${pathname}`, request.url));
  }

  /* --------------------------------------------------
     💰 Referral Code Capture (bc_referral_code)
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
     🔐 Auth Enforcement (Session-based)
  -------------------------------------------------- */
  const protectedPaths = ["/book", "/dashboard", "/partner", "/admin", "/chat"];
  const isProtected = protectedPaths.some((p) => pathname.includes(p));

  const sessionCookie =
    request.cookies.get("__session")?.value ||
    request.cookies.get("session")?.value ||
    "";

  if (isProtected && !sessionCookie) {
    const loginUrl = new URL(`/${locale}/auth/login`, request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

/* ============================================================
   ⚙️ Middleware Matcher Configuration
============================================================ */
export const config = {
  matcher: ["/((?!_next|.*\\..*|api).*)"],
};
