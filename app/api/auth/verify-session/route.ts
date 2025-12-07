// app/api/auth/session/validate/route.ts

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

/**
 * ✅ Secure session validator
 * - Supports __session, session, firebase_session
 * - Clears invalid cookies
 * - Returns proper HTTP status
 */
export async function GET(req: Request) {
  try {
    const { adminAuth } = getFirebaseAdmin();

    const cookieHeader = req.headers.get("cookie") || "";

    const sessionCookie =
      cookieHeader
        .split("; ")
        .find(
          (c) =>
            c.startsWith("__session=") ||
            c.startsWith("session=") ||
            c.startsWith("firebase_session=")
        )
        ?.split("=")[1] || "";

    if (!sessionCookie) {
      return NextResponse.json({ valid: false }, { status: 401 });
    }

    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);

    return NextResponse.json(
      {
        valid: true,
        uid: decoded.uid,
        email: decoded.email || null,
        role: decoded.role || "user",
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("❌ Session validation failed:", error);

    const res = NextResponse.json({ valid: false }, { status: 401 });

    // ✅ CLEAR ALL POSSIBLE SESSION COOKIES
    ["__session", "session", "firebase_session"].forEach((name) => {
      res.cookies.set({
        name,
        value: "",
        maxAge: 0,
        path: "/",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        ...(process.env.COOKIE_DOMAIN
          ? { domain: process.env.COOKIE_DOMAIN }
          : {}),
      });
    });

    return res;
  }
}
