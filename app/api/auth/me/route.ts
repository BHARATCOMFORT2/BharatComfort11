export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseadmin";

export async function GET(req: Request) {
  try {
    // ✅ SAFE COOKIE READ
    const sessionCookie = req.cookies.get("__session")?.value;
    if (!sessionCookie) {
      return NextResponse.json({ success: false });
    }

    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    const uid = decoded.uid;

    /* ---------------------------------------------------
       SINGLE SOURCE OF TRUTH: users collection
    ----------------------------------------------------*/
    const userSnap = await adminDb.collection("users").doc(uid).get();

    if (!userSnap.exists) {
      return NextResponse.json({
        success: true,
        user: { role: "user" },
      });
    }

    const user = userSnap.data()!;

    // ❌ NEVER LOGOUT FROM HERE
    // ❌ NO 401 / 403 FOR ROLE ISSUES

    return NextResponse.json({
      success: true,
      user: {
        role: user.role || "user",
        ...user,
      },
    });
  } catch (e) {
    console.error("AUTH CHECK ERROR:", e);

    // 🔥 DO NOT CLEAR COOKIE
    // 🔥 DO NOT FORCE LOGOUT
    return NextResponse.json({ success: false });
  }
}
