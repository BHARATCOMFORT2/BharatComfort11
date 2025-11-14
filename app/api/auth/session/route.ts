import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

function admin() {
  // always load fresh stable references
  const { adminAuth } = getFirebaseAdmin();
  if (!adminAuth) throw new Error("Firebase Admin not initialized");
  return { adminAuth };
}

/* -----------------------------------------------------------
   🟢 POST → Create Session Cookie
----------------------------------------------------------- */
export async function POST(req: Request) {
  try {
    const { token } = await req.json();
    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 400 });
    }

    const { adminAuth } = admin();
    const expiresIn = 7 * 24 * 60 * 60 * 1000; // 7 days

    const sessionCookie = await adminAuth.createSessionCookie(token, {
      expiresIn,
    });

    const res = NextResponse.json({ success: true });

    res.cookies.set("__session", sessionCookie, {
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
      { error: error.message || "Internal error" },
      { status: 500 }
    );
  }
}

/* -----------------------------------------------------------
   🟡 GET → Validate Session Cookie
----------------------------------------------------------- */
export async function GET(req: Request) {
  try {
    const { adminAuth } = admin();
    const cookieHeader = req.headers.get("cookie") || "";

    const sessionCookie =
      cookieHeader
        .split("; ")
        .find((c) => c.startsWith("__session="))?.split("=")[1] || "";

    if (!sessionCookie)
      return NextResponse.json({ authenticated: false }, { status: 401 });

    let decoded;
    try {
      decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    } catch {
      const res = NextResponse.json(
        { authenticated: false },
        { status: 401 }
      );
      res.cookies.set("__session", "", { path: "/", maxAge: 0 });
      return res;
    }

    return NextResponse.json({
      authenticated: true,
      uid: decoded.uid,
      email: decoded.email,
      role: decoded.role || "user",
    });
  } catch (error: any) {
    console.error("🔥 Session validation error:", error);
    const res = NextResponse.json({ authenticated: false }, { status: 401 });
    res.cookies.set("__session", "", { path: "/", maxAge: 0 });
    return res;
  }
}

/* -----------------------------------------------------------
   🔴 DELETE → Logout
----------------------------------------------------------- */
export async function DELETE() {
  const res = NextResponse.json({ success: true });
  res.cookies.set("__session", "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });
  return res;
}
