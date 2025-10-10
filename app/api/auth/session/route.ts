import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

export async function POST(req: Request) {
  try {
    const { token } = await req.json();
    const { adminAuth } = getFirebaseAdmin();

    // 🔒 Create session cookie valid for 7 days
    const expiresIn = 7 * 24 * 60 * 60 * 1000;
    const sessionCookie = await adminAuth.createSessionCookie(token, { expiresIn });

    const res = NextResponse.json({ success: true });
    res.cookies.set({
      name: "session",
      value: sessionCookie,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: expiresIn / 1000,
    });

    return res;
  } catch (err: any) {
    console.error("Session creation failed:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
