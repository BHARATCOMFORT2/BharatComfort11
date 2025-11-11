import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

/**
 * POST → Create or refresh a session cookie
 * GET  → Validate session and auto-refresh if needed
 * DELETE → Logout / Clear session cookie
 */
export async function POST(req: Request) {
  try {
    const { token } = await req.json();
    if (!token)
      return NextResponse.json({ error: "Missing token" }, { status: 400 });

    const { adminAuth } = getFirebaseAdmin();
    const expiresIn = 7 * 24 * 60 * 60 * 1000; // 7 days

    // ✅ Create session cookie from ID token
    const sessionCookie = await adminAuth.createSessionCookie(token, {
      expiresIn,
    });

    const res = NextResponse.json({ success: true });
    res.cookies.set({
      name: "__session", // ✅ consistent with middleware & Firebase Hosting
      value: sessionCookie,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: expiresIn / 1000,
      sameSite: "lax",
    });

    return res;
  } catch (error: any) {
    console.error("🔥 Session creation error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/* -----------------------------------------------------------
   🧠 GET → Validate & Auto-Refresh Existing Session
----------------------------------------------------------- */
export async function GET(req: Request) {
  try {
    const { adminAuth } = getFirebaseAdmin();
    const cookieHeader = req.headers.get("cookie") || "";
    const sessionCookie =
      cookieHeader
        .split("; ")
        .find((c) => c.startsWith("__session=") || c.startsWith("session="))
        ?.split("=")[1] || "";

    if (!sessionCookie)
      return NextResponse.json({ authenticated: false }, { status: 401 });

    let decoded;
    try {
      decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    } catch (err: any) {
      console.warn("⚠️ Invalid/expired session:", err.message);
      const res = NextResponse.json({ authenticated: false }, { status: 401 });
      res.cookies.set({
        name: "__session",
        value: "",
        path: "/",
        maxAge: 0,
      });
      return res;
    }

    const now = Math.floor(Date.now() / 1000);
    const timeToExpire = decoded.exp - now;
    const oneDay = 24 * 60 * 60;

    const res = NextResponse.json({
      authenticated: true,
      uid: decoded.uid,
      role: decoded.role || "user",
      email: decoded.email,
    });

    // ♻️ Auto-refresh cookie if less than 24 h remaining
    if (timeToExpire < oneDay) {
      try {
        const newToken = await adminAuth.createSessionCookie(sessionCookie, {
          expiresIn: 7 * 24 * 60 * 60 * 1000,
        });
        res.cookies.set({
          name: "__session",
          value: newToken,
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          path: "/",
          maxAge: 7 * 24 * 60 * 60,
          sameSite: "lax",
        });
        console.log("♻️ Session auto-refreshed");
      } catch (refreshError) {
        console.warn("⚠️ Session refresh failed:", refreshError);
      }
    }

    return res;
  } catch (error: any) {
    console.error("🔥 Session validation error:", error);
    const res = NextResponse.json({ authenticated: false }, { status: 401 });
    res.cookies.set({
      name: "__session",
      value: "",
      path: "/",
      maxAge: 0,
    });
    return res;
  }
}

/* -----------------------------------------------------------
   🧹 DELETE → Logout & Clear Session Cookie
----------------------------------------------------------- */
export async function DELETE() {
  const res = NextResponse.json({
    success: true,
    message: "Session cleared",
  });
  res.cookies.set({
    name: "__session",
    value: "",
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });
  return res;
}
