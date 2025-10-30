import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

/**
 * POST → Create or refresh a session cookie
 * GET  → Validate session and auto-refresh if needed
 */
export async function POST(req: Request) {
  try {
    const { token } = await req.json();
    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 400 });
    }

    const { adminAuth } = getFirebaseAdmin();

    // Session valid for 7 days
    const expiresIn = 7 * 24 * 60 * 60 * 1000;
    const sessionCookie = await adminAuth.createSessionCookie(token, { expiresIn });

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
    console.error("🔥 Session creation error:", error);
    return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 });
  }
}

/* -----------------------------------------------------------
   🧠 GET → Validate & Auto-Refresh Existing Session
----------------------------------------------------------- */
export async function GET(req: Request) {
  try {
    const { adminAuth } = getFirebaseAdmin();
    const cookieHeader = req.headers.get("cookie") || "";
    const sessionCookie = cookieHeader
      .split("; ")
      .find((c) => c.startsWith("session="))
      ?.split("=")[1];

    if (!sessionCookie) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    let decoded;
    try {
      decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    } catch (err) {
      console.warn("⚠️ Expired or invalid session:", (err as any).message);
      const res = NextResponse.json({ authenticated: false }, { status: 401 });
      res.cookies.set("session", "", { path: "/", maxAge: 0 });
      return res;
    }

    // 🔁 Auto-refresh session cookie if close to expiry (within 24h)
    const now = Date.now() / 1000; // seconds
    const timeToExpire = decoded.exp - now;
    const oneDay = 24 * 60 * 60; // 1 day in seconds

    const res = NextResponse.json({
      authenticated: true,
      uid: decoded.uid,
      role: decoded.role || "user",
      email: decoded.email,
    });

    if (timeToExpire < oneDay) {
      try {
        const newToken = await adminAuth.createSessionCookie(
          sessionCookie,
          { expiresIn: 7 * 24 * 60 * 60 * 1000 } // renew for 7 days
        );
        res.cookies.set("session", newToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          path: "/",
          maxAge: 7 * 24 * 60 * 60,
          sameSite: "strict",
        });
        console.log("♻️ Session auto-refreshed");
      } catch (refreshError) {
        console.warn("⚠️ Failed to refresh session cookie:", refreshError);
      }
    }

    return res;
  } catch (error: any) {
    console.error("🔥 Session validation error:", error);
    const res = NextResponse.json({ authenticated: false }, { status: 401 });
    res.cookies.set("session", "", { path: "/", maxAge: 0 });
    return res;
  }
}

/* -----------------------------------------------------------
   ⚙️ Optional DELETE → Log out & clear session
----------------------------------------------------------- */
export async function DELETE() {
  const res = NextResponse.json({ success: true, message: "Session cleared" });
  res.cookies.set("session", "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });
  return res;
}
