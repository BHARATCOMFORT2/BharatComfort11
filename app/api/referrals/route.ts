export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

export async function GET(req: Request) {
  try {
    const { adminAuth, adminDb } = getFirebaseAdmin();

    // Read session cookie
    const cookie = req.headers.get("cookie") || "";
    const session =
      cookie.split("; ").find((c) => c.startsWith("__session="))?.split("=")[1] ||
      "";

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Validate session
    let decoded;
    try {
      decoded = await adminAuth.verifySessionCookie(session, true);
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const uid = decoded.uid;

    /** -----------------------------------------
     * 1️⃣ Fetch referral code
     ------------------------------------------*/
    const codeDoc = await adminDb.collection("referral_codes").doc(uid).get();
    const referralCode = codeDoc.exists ? codeDoc.data() : null;

    /** -----------------------------------------
     * 2️⃣ Fetch referral activity
     * FIX: Use collection "referrals" (correct one)
     ------------------------------------------*/
    const refSnap = await adminDb
      .collection("referrals")
      .where("referrerId", "==", uid)
      .orderBy("createdAt", "desc")
      .get();

    const referrals = refSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ referralCode, referrals });
  } catch (err: any) {
    console.error("🔥 Referral API Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
