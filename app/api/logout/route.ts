import { NextResponse } from "next/server";

/**
 * 🧹 POST → Log out the current user
 * Deletes the Firebase session cookie and returns success
 */
export async function POST() {
  try {
    const res = NextResponse.json({
      success: true,
      message: "Logged out successfully.",
    });

    // 🔒 Explicitly clear the secure cookie
    res.cookies.set({
      name: "session",
      value: "",
      httpOnly: true,
      path: "/",
      maxAge: 0,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
    });

    return res;
  } catch (err: any) {
    console.error("🔥 Logout error:", err);
    return NextResponse.json(
      { success: false, message: "Logout failed. Please try again." },
      { status: 500 }
    );
  }
}
