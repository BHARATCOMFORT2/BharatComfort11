import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  ...(process.env.COOKIE_DOMAIN ? { domain: process.env.COOKIE_DOMAIN } : {}),
};

/* ======================================================
   CREATE SESSION (LOGIN)
====================================================== */
export async function POST(req: Request) {
  try {
    const { token } = await req.json();
    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 400 });
    }

    const { adminAuth } = getFirebaseAdmin();

    // ✅ MUST VERIFY ID TOKEN FIRST
    const decoded = await adminAuth.verifyIdToken(token);

    const expiresIn = 7 * 24 * 60 * 60 * 1000;
    const sessionCookie = await adminAuth.createSessionCookie(token, {
      expiresIn,
    });

    const res = NextResponse.json({ success: true, uid: decoded.uid });

    res.cookies.set("__session", sessionCookie, {
      maxAge: expiresIn / 1000,
      ...COOKIE_OPTIONS,
    });

    return res;
  } catch (error: any) {
    console.error("🔥 Session creation error:", error);
    return NextResponse.json(
      { error: "Invalid or expired token" },
      { status: 401 }
    );
  }
}

/* ======================================================
   VALIDATE SESSION
====================================================== */
export async function GET(req: Request) {
  try {
    const { adminAuth, adminDb } = getFirebaseAdmin();

    const sessionCookie = req.cookies.get("__session")?.value;
    if (!sessionCookie) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    // ✅ Verify session cookie
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);

    // ✅ FETCH ROLE FROM FIRESTORE
    const userSnap = await adminDb.doc(`users/${decoded.uid}`).get();
    if (!userSnap.exists) {
      throw new Error("User profile missing");
    }

    const userData = userSnap.data()!;

    return NextResponse.json({
      authenticated: true,
      uid: decoded.uid,
      email: decoded.email || null,
      role: userData.role || "user",
    });
  } catch (error) {
    const resp = NextResponse.json({ authenticated: false }, { status: 401 });
    resp.cookies.set("__session", "", {
      maxAge: 0,
      ...COOKIE_OPTIONS,
    });
    return resp;
  }
}

/* ======================================================
   LOGOUT
====================================================== */
export async function DELETE() {
  const res = NextResponse.json({ success: true });
  res.cookies.set("__session", "", {
    maxAge: 0,
    ...COOKIE_OPTIONS,
  });
  return res;
}
