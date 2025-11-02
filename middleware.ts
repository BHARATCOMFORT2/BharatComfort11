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
   🔐 Middleware: Locale + Auth + Role + Route Control
============================================================ */
export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const locale = getLocale(request);

  /* --------------------------------------------------
     🚫 Skip middleware for static / API / internal files
  -------------------------------------------------- */
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.match(/\.(ico|png|jpg|jpeg|svg|css|js|woff2?)$/)
  ) {
    return NextResponse.next();
  }

  /* --------------------------------------------------
     🌍 Ensure locale prefix (auto-redirect)
  -------------------------------------------------- */
  if (!i18n.locales.some((loc) => pathname.startsWith(`/${loc}`))) {
    return NextResponse.redirect(new URL(`/${locale}${pathname}`, request.url));
  }

  /* --------------------------------------------------
     🔐 Auth Enforcement
  -------------------------------------------------- */
  const sessionCookie = request.cookies.get("session")?.value || "";
  const protectedPaths = ["/book", "/dashboard", "/partner", "/admin", "/chat"];
  const isProtected = protectedPaths.some((p) => pathname.includes(p));

  // 🚪 If protected and no session → redirect to login
  if (isProtected && !sessionCookie) {
    const loginUrl = new URL(`/${locale}/auth/login`, request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  /* --------------------------------------------------
     ✅ Validate Session via API (server-side check)
  -------------------------------------------------- */
  if (sessionCookie) {
    try {
      const verifyUrl =
        process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") +
        "/api/auth/session"; // use main session route, not verify-session

      const res = await fetch(verifyUrl, {
        method: "GET",
        headers: { cookie: `session=${sessionCookie}` },
      });

      if (!res.ok) {
        console.warn("⚠️ Invalid session detected (status):", res.status);
        const loginUrl = new URL(`/${locale}/auth/login`, request.url);
        loginUrl.searchParams.set("redirect", pathname);
        const r = NextResponse.redirect(loginUrl);
        r.cookies.delete("session");
        return r;
      }

      const data = await res.json();

      // 🔄 Auto redirect by role if needed
      const role = data.role || "user";
      if (pathname.includes("/admin") && role !== "admin") {
        return NextResponse.redirect(
          new URL(`/${locale}/(dashboard)/user`, request.url)
        );
      }
      if (pathname.includes("/partner") && role !== "partner") {
        return NextResponse.redirect(
          new URL(`/${locale}/(dashboard)/user`, request.url)
        );
      }
    } catch (err) {
      console.error("🔥 Session verification failed:", err);
      const loginUrl = new URL(`/${locale}/auth/login`, request.url);
      loginUrl.searchParams.set("redirect", pathname);
      const r = NextResponse.redirect(loginUrl);
      r.cookies.delete("session");
      return r;
    }
  }

  /* --------------------------------------------------
     ✅ Default: Allow normal browsing (public routes)
  -------------------------------------------------- */
  return NextResponse.next();
}

/* ============================================================
   ⚙️ Middleware Configuration
============================================================ */
export const config = {
  matcher: ["/((?!_next|.*\\..*|api).*)"],
};
