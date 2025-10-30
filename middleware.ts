import { NextRequest, NextResponse } from "next/server";
import { i18n } from "./app/i18n/settings";

/* --------------------------------------------------
   🌐 Locale Detection
-------------------------------------------------- */
function getLocale(request: NextRequest): string {
  const { locales, defaultLocale } = i18n;
  const pathLocale = request.nextUrl.pathname.split("/")[1];
  if (locales.includes(pathLocale)) return pathLocale;

  const acceptLang = request.headers.get("accept-language") || "";
  const detected = locales.find((l) => acceptLang.toLowerCase().includes(l));
  return detected || defaultLocale;
}

/* --------------------------------------------------
   🧠 Middleware
-------------------------------------------------- */
export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const locale = getLocale(request);

  // 🚫 Skip static assets, API routes, and Next internals
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.match(/\.(ico|png|jpg|jpeg|svg|css|js|woff2?)$/)
  ) {
    return NextResponse.next();
  }

  // 🌍 Ensure locale prefix (e.g., /en, /hi)
  if (!i18n.locales.some((loc) => pathname.startsWith(`/${loc}`))) {
    return NextResponse.redirect(new URL(`/${locale}${pathname}`, request.url));
  }

  /* --------------------------------------------------
     🔐 Auth Logic
     - Guests can browse all listings & homepage
     - Only /book, /chat, /dashboard, /partner, /admin need login
  -------------------------------------------------- */
  const sessionCookie = request.cookies.get("session")?.value;

  // These routes require authentication
  const protectedPaths = [
    "/book",
    "/dashboard",
    "/partner",
    "/admin",
    "/chat",
  ];

  // Check if this page is protected
  const isProtected = protectedPaths.some((p) => pathname.includes(p));

  // 🔒 If protected and no session → redirect to login
  if (isProtected && !sessionCookie) {
    const loginUrl = new URL(`/${locale}/auth/login`, request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ✅ If session exists, verify via secure API (Node runtime)
  if (sessionCookie) {
    try {
      const verifyUrl =
        process.env.NEXT_PUBLIC_APP_URL + "/api/auth/verify-session";

      const res = await fetch(verifyUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session: sessionCookie }),
      });

      const { valid, role } = await res.json();

      // 🔄 Invalid or expired session → force re-login
      if (!valid) {
        const loginUrl = new URL(`/${locale}/auth/login`, request.url);
        loginUrl.searchParams.set("redirect", pathname);
        const r = NextResponse.redirect(loginUrl);
        r.cookies.delete("session");
        return r;
      }

      // 👮 Role protection
      if (pathname.includes("/admin") && role !== "admin") {
        return NextResponse.redirect(
          new URL(`/${locale}/user/dashboard`, request.url)
        );
      }
      if (pathname.includes("/partner") && role !== "partner") {
        return NextResponse.redirect(
          new URL(`/${locale}/user/dashboard`, request.url)
        );
      }
    } catch (err) {
      console.error("⚠️ Session verification failed:", err);
    }
  }

  /* --------------------------------------------------
     ✅ Allow normal browsing
     (Home, Listings, About, etc.)
  -------------------------------------------------- */
  return NextResponse.next();
}

/* --------------------------------------------------
   ⚙️ Middleware Config
-------------------------------------------------- */
export const config = {
  matcher: ["/((?!_next|.*\\..*|api).*)"],
};
