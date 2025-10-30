import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

export async function POST(req: Request) {
  try {
    const { session } = await req.json();
    if (!session) return NextResponse.json({ valid: false });

    const { adminAuth } = getFirebaseAdmin();
    const decoded = await adminAuth.verifySessionCookie(session, true);

    return NextResponse.json({ valid: true, role: decoded.role || "user" });
  } catch (error) {
    return NextResponse.json({ valid: false });
  }
}
