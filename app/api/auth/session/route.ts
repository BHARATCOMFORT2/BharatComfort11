import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const preferredRegion = "auto";

/**
 * ✅ SAFE COOKIE OPTIONS
 * - Never hardcode domain
 * - Uses env only in production
 */
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  ...(process.env.COOKIE_DOMAIN ? { domain: process.env.COOKIE_DOMAIN } : {}),
};

/* ======================================================
   ✅ CREATE SESSION (LOGIN)
====================================================== */
export async function POST(req: Request) {
  try {
    const { token } = await req.json();

    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 400 });
    }

    const { adminAuth } = getFirebaseAdmin();

    const expiresIn = 7 * 24 * 60 * 60 * 1000; // 7 days
    const sessionCookie = await adminAuth.createSessionCookie(token, {
      expiresIn,
    });

    const res = NextResponse.json({ success: true });

    res.cookies.set({
      name: "__session",
      value: sessionCookie,
      maxAge: expiresIn / 1000,
      ...COOKIE_OPTIONS,
    });

    return res;
  } catch (error: any) {
    console.error("🔥 Session creation error:", error?.message || error);
    return NextResponse.json(
      { error: error.message || "Internal error" },
      { status: 500 }
    );
  }
}

/* ======================================================
   ✅ VALIDATE SESSION
====================================================== */
export async function GET(req: Request) {
  try {
    const { adminAuth } = getFirebaseAdmin();

    const cookieHeader = req.headers.get("cookie") || "";
    const raw = cookieHeader
      .split("; ")
      .find((c) => c.startsWith("__session="));

    const sessionCookie = raw?.split("=")[1];

    if (!sessionCookie) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    let decoded;
    try {
      decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    } catch (err) {
      const resp = NextResponse.json(
        { authenticated: false },
        { status: 401 }
      );
      resp.cookies.set({
        name: "__session",
        value: "",
        maxAge: 0,
        ...COOKIE_OPTIONS,
      });
      return resp;
    }

    return NextResponse.json({
      authenticated: true,
      uid: decoded.uid,
      role: decoded.role || "user",
      email: decoded.email || null,
    });
  } catch (err) {
    const resp = NextResponse.json({ authenticated: false }, { status: 401 });
    resp.cookies.set({
      name: "__session",
      value: "",
      maxAge: 0,
      ...COOKIE_OPTIONS,
    });
    return resp;
  }
}

/* ======================================================
   ✅ LOGOUT / CLEAR SESSION
====================================================== */
export async function DELETE() {
  const res = NextResponse.json({ success: true });

  res.cookies.set({
    name: "__session",
    value: "",
    maxAge: 0,
    ...COOKIE_OPTIONS,
  });

  return res;
}
