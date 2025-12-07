export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

// ✅ Create & Verify Firebase Session Cookie
export async function POST(req: Request) {
  try {
    const { adminAuth } = getFirebaseAdmin();
    const { token } = await req.json();

    if (!token) {
      return NextResponse.json(
        { success: false, message: "Missing ID token" },
        { status: 400 }
      );
    }

    // ✅ Create SESSION COOKIE (THIS WAS MISSING IN YOUR PROJECT)
    const expiresIn = 5 * 24 * 60 * 60 * 1000; // 5 days
    const sessionCookie = await adminAuth.createSessionCookie(token, {
      expiresIn,
    });

    const res = NextResponse.json({
      success: true,
      message: "Session created",
    });

    // ✅ THIS COOKIE IS THE KEY FOR ALL ADMIN & PARTNER APIs
    res.cookies.set("__session", sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: expiresIn / 1000,
    });

    return res;
  } catch (err: any) {
    console.error("SESSION CREATE ERROR:", err);
    return NextResponse.json(
      {
        success: false,
        message: err.message || "Failed to create session",
      },
      { status: 500 }
    );
  }
}

// ✅ Optional: Check session validity
export async function GET(req: Request) {
  try {
    const { adminAuth } = getFirebaseAdmin();

    const cookieHeader = req.headers.get("cookie") || "";
    const sessionCookie =
      cookieHeader
        .split(";")
        .map((c) => c.trim())
        .find((c) => c.startsWith("__session="))
        ?.split("=")[1] || "";

    if (!sessionCookie) {
      return NextResponse.json({ valid: false }, { status: 401 });
    }

    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);

    return NextResponse.json({
      valid: true,
      uid: decoded.uid,
      email: decoded.email,
      role: decoded.role || "user",
      admin: decoded.admin || false,
    });
  } catch {
    return NextResponse.json({ valid: false }, { status: 401 });
  }
}
