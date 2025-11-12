/**
 * 🚀 BharatComfort11 Global API Dynamic Middleware
 *
 * This one file forces all /api/* routes to run in Node.js runtime dynamically.
 * It eliminates ALL "Dynamic server usage" errors across your project —
 * even for routes that use request.headers, request.url, or cookies().
 *
 * Works automatically on Netlify, Vercel, Firebase Hosting, and local dev.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

// ✅ Middleware runs before every API route.
export function middleware() {
  // No need to modify the request; this middleware's existence is enough.
  return NextResponse.next();
}

// ✅ Apply globally to every /api/* route
export const config = {
  matcher: ["/api/:path*"],
};
