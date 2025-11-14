import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

export async function GET(req: Request) {
  try {
    const { adminAuth } = getFirebaseAdmin();

    // Read session cookie directly
    const cookieHeader = req.headers.get("cookie") || "";
    const sessionCookie =
      cookieHeader
        .split("; ")
        .find((c) => c.startsWith("__session="))
        ?.split("=")[1] || "";

    if (!sessionCookie) {
      return NextResponse.json({ valid: false });
    }

    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);

    return NextResponse.json({
      valid: true,
      uid: decoded.uid,
      email: decoded.email,
      role: decoded.role || "user",
    });
  } catch (error) {
    return NextResponse.json({ valid: false });
  }
}
