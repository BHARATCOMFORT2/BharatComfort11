/**
 * ✅ Global API Middleware (Fixes Dynamic Server Usage for All Routes)
 *
 * This ensures every /api/* route executes on-demand in Node.js runtime
 * instead of being pre-rendered or cached statically during Netlify build.
 *
 * 🔥 Fixes errors like:
 *   "Dynamic server usage: Route /api/... couldn't be rendered statically
 *    because it used request.headers or request.url"
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

export function middleware() {
  // ✅ Do nothing — this middleware only declares dynamic behavior
  return NextResponse.next();
}

// ✅ Apply to all API routes
export const config = {
  matcher: ["/api/:path*"],
};
