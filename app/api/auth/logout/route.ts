export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";

/**
 * POST → Logout user and clear session cookie
 */
export async function POST() {
  const res = NextResponse.json({
    success: true,
    message: "Logged out successfully",
  });

  // ✅ Unified cookie clearing
  res.cookies.set({
    name: "__session",
    value: "",
    path: "/",
    httpOnly: true,
    maxAge: 0,
  });

  return res;
}
