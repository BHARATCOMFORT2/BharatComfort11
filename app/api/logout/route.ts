export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";

/**
 * 🧹 POST → Log out current user
 * Correctly clears the Firebase __session cookie
 */
export async function POST() {
  try {
    const res = NextResponse.json({
      success: true,
      message: "Logged out successfully.",
    });

    // 🔥 IMPORTANT: COOKIE NAME MUST BE "__session" — not "session"
    res.cookies.set({
      name: "__session",
      value: "",
      httpOnly: true,
      path: "/",
      maxAge: 0,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    return res;
  } catch (err) {
    console.error("🔥 Logout error:", err);
    return NextResponse.json(
      { success: false, message: "Logout failed. Try again." },
      { status: 500 }
    );
  }
}
