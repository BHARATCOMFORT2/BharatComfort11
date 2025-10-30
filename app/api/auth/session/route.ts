import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

/**
 * Create a secure session cookie after login
 */
export async function POST(req: Request) {
  try {
    const { token } = await req.json();

    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 400 });
    }

    const { adminAuth } = getFirebaseAdmin();

    // 🔹 Expiration: 7 days (in ms)
    const expiresIn = 7 * 24 * 60 * 60 * 1000;

    // 🔹 Create Firebase session cookie
    const sessionCookie = await adminAuth.createSessionCookie(token, { expiresIn });

    // 🔹 Return response with HttpOnly cookie
    const res = NextResponse.json({ success: true });
    res.cookies.set("session", sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: expiresIn / 1000,
      sameSite: "strict",
    });

    return res;
  } catch (error: any) {
    console.error("Session creation error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

/**
 * Validate existing session cookie (optional GET endpoint)
 * Can be used by dashboard pages to verify authentication
 */
export async function GET(req: Request) {
  try {
    const { adminAuth } = getFirebaseAdmin();

    const cookieHeader = req.headers.get("cookie") || "";
    const session = cookieHeader
      .split("; ")
      .find((c) => c.startsWith("session="))
      ?.split("=")[1];

    if (!session) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    // 🔹 Verify Firebase session cookie
    const decoded = await adminAuth.verifySessionCookie(session, true);

    return NextResponse.json({
      authenticated: true,
      uid: decoded.uid,
      role: decoded.role || "user",
      email: decoded.email,
    });
  } catch (error: any) {
    console.error("Session validation error:", error);
    return NextResponse.json(
      { authenticated: false, error: error.message },
      { status: 401 }
    );
  }
}
