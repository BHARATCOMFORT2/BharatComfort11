export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";
import * as admin from "firebase-admin";

export async function POST(req: Request) {
  try {
    const { adminAuth, adminDb } = getFirebaseAdmin();

    // Read session cookie
    const cookie = req.headers.get("cookie") || "";
    const session =
      cookie.split("; ").find((c) => c.startsWith("__session="))?.split("=")[1] || "";

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify session
    let decoded;
    try {
      decoded = await adminAuth.verifySessionCookie(session, true);
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const uid = decoded.uid;

    // Check if already exists
    const codeDoc = await adminDb.collection("referral_codes").doc(uid).get();
    if (codeDoc.exists) {
      return NextResponse.json({
        referralCode: codeDoc.data()?.referralCode,
        message: "Referral code already exists",
      });
    }

    // Generate unique referral code (8 chars)
    const referralCode = uid.slice(0, 4).toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase();

    // Save referral code
    await adminDb
      .collection("referral_codes")
      .doc(uid)
      .set({
        uid,
        referralCode,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    return NextResponse.json({
      success: true,
      referralCode,
    });
  } catch (error: any) {
    console.error("🔥 Referral Code Generation Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
