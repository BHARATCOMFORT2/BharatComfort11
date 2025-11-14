// app/api/session/route.ts
import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

/* -------------------------------------------------------
   FIXED: Always use the SAME cookie domain
--------------------------------------------------------*/
const COOKIE_DOMAIN =
  process.env.NODE_ENV === "production"
    ? ".bharatcomfort.online" // works for both www + root
    : undefined;

/* -------------------------------------------------------
   Admin Helper
--------------------------------------------------------*/
function admin() {
  const { adminAuth } = getFirebaseAdmin();
  if (!adminAuth) throw new Error("Firebase Admin not initialized");
  return { adminAuth };
}

/* -------------------------------------------------------
   POST → Create Session Cookie
--------------------------------------------------------*/
export async function POST(req: Request) {
  try {
    const { token } = await req.json();
    if (!token)
      return NextResponse.json({ error: "Missing token" }, { status: 400 });

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
      sameSite: "lax",
      maxAge: expiresIn / 1000,
      domain: COOKIE_DOMAIN,
    });

    console.log("SESSION COOKIE SET → DOMAIN:", COOKIE_DOMAIN);

    return res;
  } catch (err: any) {
    console.error("🔥 Session creation error:", err);
    return NextResponse.json(
      { error: err.message || "Internal error" },
      { status: 500 }
    );
  }
}

/* -------------------------------------------------------
   GET → Validate Session Cookie
--------------------------------------------------------*/
export async function GET(req: Request) {
  try {
    const { adminAuth } = admin();
    const cookieHeader = req.headers.get("cookie") || "";

    const sessionCookie =
      cookieHeader
        .split(";")
        .find((c) => c.trim().startsWith("__session="))
        ?.split("=")[1] || "";

    if (!sessionCookie)
      return NextResponse.json({ authenticated: false }, { status: 401 });

    let decoded;
    try {
      decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    } catch (err) {
      // delete invalid cookie
      const res = NextResponse.json(
        { authenticated: false },
        { status: 401 }
      );

      res.cookies.set("__session", "", {
        httpOnly: true,
        maxAge: 0,
        path: "/",
        domain: COOKIE_DOMAIN,
      });

      return res;
    }

    return NextResponse.json({
      authenticated: true,
      uid: decoded.uid,
      email: decoded.email,
      role: decoded.role || "user",
    });
  } catch (err: any) {
    console.error("🔥 Session validation error:", err);
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}

/* -------------------------------------------------------
   DELETE → Logout
--------------------------------------------------------*/
export async function DELETE() {
  const res = NextResponse.json({ success: true });

  res.cookies.set("__session", "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
    domain: COOKIE_DOMAIN,
  });

  console.log("🔒 SESSION CLEARED — DOMAIN:", COOKIE_DOMAIN);

  return res;
}
