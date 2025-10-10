import { NextRequest, NextResponse } from "next/server";
import { i18n } from "./app/i18n/settings";

// ✅ Detect locale
function getLocale(request: NextRequest): string {
  const { locales, defaultLocale } = i18n;
  const pathLocale = request.nextUrl.pathname.split("/")[1];
  if (locales.includes(pathLocale)) return pathLocale;

  const acceptLang = request.headers.get("accept-language") || "";
  const detected = locales.find((l) => acceptLang.toLowerCase().includes(l));
  return detected || defaultLocale;
}

export async function middleware(request: NextRequest) {
  const locale = getLocale(request);
  const pathname = request.nextUrl.pathname;

  // Skip static, API, and assets
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.match(/\.(ico|png|jpg|jpeg|svg|css|js|woff2?)$/)
  ) {
    return NextResponse.next();
  }

  // Add locale prefix if missing
  if (!i18n.locales.some((loc) => pathname.startsWith(`/${loc}`))) {
    return NextResponse.redirect(new URL(`/${locale}${pathname}`, request.url));
  }

  // Read session cookie
  const sessionCookie = request.cookies.get("session")?.value;
  if (!sessionCookie) {
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

  // Decode JWT safely
  let role = "user";
  try {
    const payload = JSON.parse(
      Buffer.from(sessionCookie.split(".")[1], "base64").toString()
    );
    role = payload?.role || "user";
  } catch {}

  // Role restrictions
  if (pathname.includes("/admin") && role !== "admin") {
    return NextResponse.redirect(new URL(`/${locale}/user/dashboard`, request.url));
  }
  if (pathname.includes("/partner") && role !== "partner") {
    return NextResponse.redirect(new URL(`/${locale}/user/dashboard`, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|.*\\..*|api).*)"],
};
