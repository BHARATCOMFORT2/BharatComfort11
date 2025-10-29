import { NextRequest, NextResponse } from "next/server";
import { i18n } from "./app/i18n/settings";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

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

  // Skip static assets & API routes
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.match(/\.(ico|png|jpg|jpeg|svg|css|js|woff2?)$/)
  ) {
    return NextResponse.next();
  }

  // Locale prefixing
  if (!i18n.locales.some((loc) => pathname.startsWith(`/${loc}`))) {
    return NextResponse.redirect(new URL(`/${locale}${pathname}`, request.url));
  }

  /* --------------------------------------------------
     🔐 Session Cookie Check
  -------------------------------------------------- */
  const sessionCookie = request.cookies.get("session")?.value;

  // Redirect unauthenticated users from protected routes
  const protectedPaths = ["/dashboard", "/partner", "/admin", "/book", "/chat"];
  const isProtected = protectedPaths.some((p) => pathname.includes(p));

  if (!sessionCookie) {
    if (isProtected) {
      const loginUrl = new URL(`/${locale}/auth/login`, request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  /* --------------------------------------------------
     🔎 Verify Session Cookie with Firebase Admin
  -------------------------------------------------- */
  let decoded: any = null;
  try {
    const { adminAuth } = getFirebaseAdmin();
    decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
  } catch (err: any) {
    console.warn("⚠️ Invalid or expired session cookie:", err.message);

    // Clear invalid cookie & redirect to login
    const loginUrl = new URL(`/${locale}/auth/login`, request.url);
    loginUrl.searchParams.set("redirect", pathname);

    const res = NextResponse.redirect(loginUrl);
    res.cookies.set({
      name: "session",
      value: "",
      path: "/",
      maxAge: 0,
    });
    return res;
  }

  /* --------------------------------------------------
     👮 Role-based Route Protection
  -------------------------------------------------- */
  const role = decoded?.role || "user";

  if (pathname.includes("/admin") && role !== "admin") {
    return NextResponse.redirect(new URL(`/${locale}/user/dashboard`, request.url));
  }
  if (pathname.includes("/partner") && role !== "partner") {
    return NextResponse.redirect(new URL(`/${locale}/user/dashboard`, request.url));
  }

  /* --------------------------------------------------
     ✅ Allow Request
  -------------------------------------------------- */
  return NextResponse.next();
}

/* --------------------------------------------------
   ⚙️ Middleware Config
-------------------------------------------------- */
export const config = {
  matcher: ["/((?!_next|.*\\..*|api).*)"],
};
