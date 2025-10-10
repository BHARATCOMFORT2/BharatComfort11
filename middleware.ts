import { NextRequest, NextResponse } from "next/server";
import { i18n } from "./app/i18n/settings";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

// ✅ Function to detect locale
function getLocale(request: NextRequest): string {
  const { locales, defaultLocale } = i18n;

  // 1. Check URL prefix
  const pathname = request.nextUrl.pathname.split("/")[1];
  if (locales.includes(pathname)) {
    return pathname;
  }

  // 2. Detect from browser
  const acceptLang = request.headers.get("accept-language") || "";
  const detected = locales.find((loc) =>
    acceptLang.toLowerCase().includes(loc)
  );
  if (detected) return detected;

  // 3. Default
  return defaultLocale;
}

export async function middleware(request: NextRequest) {
  const { adminAuth } = getFirebaseAdmin();
  const locale = getLocale(request);
  const pathname = request.nextUrl.pathname;

  // 🔹 Step 1: Auto-redirect to locale if missing
  if (!i18n.locales.some((loc) => pathname.startsWith(`/${loc}`))) {
    return NextResponse.redirect(new URL(`/${locale}${pathname}`, request.url));
  }

  // 🔹 Step 2: Skip for APIs, static assets, or public pages
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.match(/\.(ico|png|jpg|jpeg|svg|css|js)$/)
  ) {
    return NextResponse.next();
  }

  // 🔹 Step 3: Read session cookie
  const sessionCookie = request.cookies.get("session")?.value;

  if (!sessionCookie) {
    // Unauthenticated: redirect to login if accessing protected routes
    if (
      pathname.includes("/dashboard") ||
      pathname.includes("/book") ||
      pathname.includes("/chat")
    ) {
      const loginUrl = new URL(`/${locale}/auth/login`, request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  try {
    // 🔹 Step 4: Verify session via Firebase Admin
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    const role = decoded?.role || "user";

    // 🔹 Step 5: Role-based route restriction
    if (pathname.includes("/admin") && role !== "admin") {
      return NextResponse.redirect(new URL(`/${locale}/user/dashboard`, request.url));
    }
    if (pathname.includes("/partner") && role !== "partner") {
      return NextResponse.redirect(new URL(`/${locale}/user/dashboard`, request.url));
    }

    // ✅ Allow access
    return NextResponse.next();
  } catch (error) {
    console.error("❌ Middleware auth error:", error);
    const loginUrl = new URL(`/${locale}/auth/login`, request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }
}

// ✅ Apply middleware to all non-static routes
export const config = {
  matcher: ["/((?!_next|.*\\..*|api).*)"],
};
