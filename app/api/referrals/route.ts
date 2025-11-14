import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    // Always load fresh stable admin references
    const { adminAuth, adminDb } = getFirebaseAdmin();

    const cookie = req.headers.get("cookie") || "";
    const session =
      cookie.split("; ").find((c) => c.startsWith("__session="))?.split("=")[1] ||
      "";

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify session cookie
    let decoded;
    try {
      decoded = await adminAuth.verifySessionCookie(session, true);
    } catch (e) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const uid = decoded.uid;

    /* ------------------------------------------
       1️⃣ Fetch Referral Code
    --------------------------------------------- */
    const codeDoc = await adminDb.collection("referral_codes").doc(uid).get();
    const referralCode = codeDoc.exists ? codeDoc.data() : null;

    /* ------------------------------------------
       2️⃣ Fetch Referral Activity
    --------------------------------------------- */
    const refSnap = await adminDb
      .collection("refer_and_earn")
      .where("referrerId", "==", uid)
      .orderBy("createdAt", "desc")
      .get();

    const referrals = refSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({
      referralCode,
      referrals,
    });
  } catch (err: any) {
    console.error("🔥 Referral API Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
