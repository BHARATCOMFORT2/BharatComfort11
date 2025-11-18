import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

// ❗ IMPORTANT: DO NOT ADD `runtime = "nodejs"` HERE
export const dynamic = "force-dynamic";
export const preferredRegion = "auto";

/**
 * POST → Create or refresh a session cookie
 */
export async function POST(req: Request) {
  try {
    const { token } = await req.json();
    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 400 });
    }

    const { adminAuth } = getFirebaseAdmin();

    const expiresIn = 7 * 24 * 60 * 60 * 1000; // 7 days
    const sessionCookie = await adminAuth.createSessionCookie(token, { expiresIn });

    const res = NextResponse.json({ success: true });

    res.cookies.set({
      name: "session",
      value: sessionCookie,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: expiresIn / 1000,
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

/**
 * GET → Validate session + auto-refresh near expiry
 */
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
      console.warn("⚠️ Invalid or expired session:", (err as any).message);

      const res = NextResponse.json({ authenticated: false }, { status: 401 });
      res.cookies.set({
        name: "session",
        value: "",
        path: "/",
        maxAge: 0,
      });

      return res;
    }

    const now = Math.floor(Date.now() / 1000);
    const timeLeft = decoded.exp - now;
    const oneDay = 24 * 60 * 60;

    const res = NextResponse.json({
      authenticated: true,
      uid: decoded.uid,
      role: decoded.role || "user",
      email: decoded.email,
    });

    // Auto-refresh if < 1 day remaining
    if (timeLeft < oneDay) {
      try {
        const newCookie = await adminAuth.createSessionCookie(sessionCookie, {
          expiresIn: 7 * 24 * 60 * 60 * 1000,
        });

        res.cookies.set({
          name: "session",
          value: newCookie,
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          path: "/",
          maxAge: 7 * 24 * 60 * 60,
          sameSite: "strict",
        });
      } catch (e) {
        console.warn("⚠️ Could not refresh session cookie:", e);
      }
    }

    return res;
  } catch (error: any) {
    console.error("🔥 GET session error:", error);

    const res = NextResponse.json({ authenticated: false }, { status: 401 });
    res.cookies.set({
      name: "session",
      value: "",
      path: "/",
      maxAge: 0,
    });

    return res;
  }
}

/**
 * DELETE → Logout
 */
export async function DELETE() {
  const res = NextResponse.json({ success: true });

  res.cookies.set({
    name: "session",
    value: "",
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });

  return res;
}
