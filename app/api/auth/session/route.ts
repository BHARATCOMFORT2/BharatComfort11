import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const preferredRegion = "auto";

/* ==========================================
   SAFE COOKIE OPTIONS
========================================== */
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  ...(process.env.COOKIE_DOMAIN
    ? { domain: process.env.COOKIE_DOMAIN }
    : {}),
};

/* ==========================================
   Helper: Extract Bearer Token
========================================== */
function getBearerToken(req: Request) {
  const h = req.headers.get("authorization");
  if (!h?.startsWith("Bearer ")) return null;
  return h.substring(7);
}

/* ======================================================
   ✅ CREATE SESSION (LOGIN)
   POST /api/auth/session
====================================================== */
export async function POST(req: Request) {
  try {
    const token = getBearerToken(req);
    if (!token) {
      return NextResponse.json(
        { error: "Missing Authorization token" },
        { status: 401 }
      );
    }

    const { adminAuth } = getFirebaseAdmin();

    // Verify ID token first (important)
    await adminAuth.verifyIdToken(token);

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
      { error: "Session creation failed" },
      { status: 401 }
    );
  }
}

/* ======================================================
   ✅ VALIDATE SESSION
   GET /api/auth/session
====================================================== */
export async function GET(req: Request) {
  try {
    const { adminAuth } = getFirebaseAdmin();

    const sessionCookie = req.cookies.get("__session")?.value;
    if (!sessionCookie) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const decoded = await adminAuth.verifySessionCookie(
      sessionCookie,
      true
    );

    return NextResponse.json({
      authenticated: true,
      uid: decoded.uid,
      role: decoded.role || "user",
      email: decoded.email || null,
    });
  } catch (err) {
    const res = NextResponse.json(
      { authenticated: false },
      { status: 401 }
    );
    res.cookies.set({
      name: "__session",
      value: "",
      maxAge: 0,
      ...COOKIE_OPTIONS,
    });
    return res;
  }
}

/* ======================================================
   ✅ LOGOUT
   DELETE /api/auth/session
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
