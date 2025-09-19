// middleware.ts

import { NextRequest, NextResponse } from "next/server";
import { i18n } from "./app/i18n/settings";

function getLocale(request: NextRequest): string {
  const { locales, defaultLocale } = i18n;

  // 1. Check if URL already has a locale prefix (/en, /hi, etc.)
  const pathname = request.nextUrl.pathname.split("/")[1];
  if (locales.includes(pathname)) {
    return pathname;
  }

  // 2. Check Accept-Language header from browser
  const acceptLang = request.headers.get("accept-language") || "";
  const detected = locales.find((loc) =>
    acceptLang.toLowerCase().includes(loc)
  );
  if (detected) return detected;

  // 3. Fallback to default
  return defaultLocale;
}

export function middleware(request: NextRequest) {
  const locale = getLocale(request);

  // Redirect if path does not include locale
  const pathname = request.nextUrl.pathname;
  if (!i18n.locales.some((loc) => pathname.startsWith(`/${loc}`))) {
    return NextResponse.redirect(
      new URL(`/${locale}${pathname}`, request.url)
    );
  }

  return NextResponse.next();
}

export const config = {
  // Run middleware on all routes except API, static files, etc.
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
